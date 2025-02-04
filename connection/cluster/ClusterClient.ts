/*
 * Copyright (C) 2022 Vaticle
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Database } from "../../api/connection/database/Database";
import { TypeDBClient } from "../../api/connection/TypeDBClient";
import { TypeDBCredential } from "../../api/connection/TypeDBCredential";
import { TypeDBClusterOptions, TypeDBOptions } from "../../api/connection/TypeDBOptions";
import { SessionType } from "../../api/connection/TypeDBSession";
import { ErrorMessage } from "../../common/errors/ErrorMessage";
import { TypeDBClientError } from "../../common/errors/TypeDBClientError";
import { RequestBuilder } from "../../common/rpc/RequestBuilder";
import { ClusterDatabaseManager } from "./ClusterDatabaseManager";
import { ClusterServerClient } from "./ClusterServerClient";
import { ClusterServerStub } from "./ClusterServerStub";
import { ClusterSession } from "./ClusterSession";
import { ClusterUser } from "./ClusterUser";
import { ClusterUserManager } from "./ClusterUserManager";
import { FailsafeTask } from "./FailsafeTask";
import CLUSTER_UNABLE_TO_CONNECT = ErrorMessage.Client.CLUSTER_UNABLE_TO_CONNECT;
import CLIENT_NOT_OPEN = ErrorMessage.Client.CLIENT_NOT_OPEN;

export class ClusterClient implements TypeDBClient.Cluster {

    private readonly _addresses: string[];
    private readonly _credential: TypeDBCredential;

    private _serverClients: { [serverAddress: string]: ClusterServerClient };
    private _userManager: ClusterUserManager;
    private _databaseManagers: ClusterDatabaseManager;
    private _databases: { [db: string]: Database.Cluster };
    private _isOpen: boolean;

    constructor(addresses: string[], credential: TypeDBCredential) {
        this._addresses = addresses;
        this._credential = credential;
    }

    async open(): Promise<this> {
        const serverAddresses = await this.fetchClusterServers();
        this._serverClients = {}
        const openReqs: Promise<ClusterServerClient>[] = []
        for (const addr of serverAddresses) {
            const serverClient = new ClusterServerClient(addr, this._credential);
            openReqs.push(serverClient.open());
            this._serverClients[addr] = serverClient;
        }
        await Promise.all(openReqs);
        this._userManager = new ClusterUserManager(this);
        this._databaseManagers = new ClusterDatabaseManager(this);
        this._databases = {};
        this._isOpen = true;
        return this;
    }

    isOpen(): boolean {
        return this._isOpen;
    }

    async user(): Promise<ClusterUser> {
        return await this.users.get(this._credential.username)
    }

    get users(): ClusterUserManager {
        return this._userManager;
    }

    get databases(): ClusterDatabaseManager {
        return this._databaseManagers;
    }

    clusterDatabases(): { [db: string]: Database.Cluster } {
        return this._databases;
    }

    session(database: string, type: SessionType, options: TypeDBClusterOptions = TypeDBOptions.cluster()): Promise<ClusterSession> {
        if (!this.isOpen()) throw new TypeDBClientError(CLIENT_NOT_OPEN);
        if (options.readAnyReplica) {
            return this.sessionAnyReplica(database, type, options);
        } else {
            return this.sessionPrimaryReplica(database, type, options);
        }
    }

    private sessionPrimaryReplica(database: string, type: SessionType, options: TypeDBClusterOptions): Promise<ClusterSession> {
        return new OpenSessionFailsafeTask(database, type, options, this).runPrimaryReplica();
    }

    private sessionAnyReplica(database: string, type: SessionType, options: TypeDBClusterOptions): Promise<ClusterSession> {
        return new OpenSessionFailsafeTask(database, type, options, this).runAnyReplica();
    }

    clusterServerClients() {
        return this._serverClients;
    }

    clusterServerClient(address: string): ClusterServerClient {
        return this._serverClients[address];
    }

    clusterServerAddresses(): string[] {
        return Object.keys(this._serverClients);
    }

    stub(address: string): ClusterServerStub {
        return this._serverClients[address].stub();
    }

    isCluster(): boolean {
        return true;
    }

    asCluster(): TypeDBClient.Cluster {
        return this;
    }

    async close(): Promise<void> {
        if (this._isOpen) {
            this._isOpen = false;
            for (const serverClient of Object.values(this._serverClients)) {
                await serverClient.close();
            }
        }
    }

    private async fetchClusterServers(): Promise<string[]> {
        for (const address of this._addresses) {
            try {
                console.info(`Fetching list of cluster servers from ${address}...`);
                const clusterStub = new ClusterServerStub(address, this._credential);
                await clusterStub.open();
                const res = await clusterStub.serversAll(RequestBuilder.Cluster.ServerManager.allReq());
                const members = res.getServersList().map(x => x.getAddress());
                console.info(`The cluster servers are ${members}`);
                return members;
            } catch (e) {
                console.error(`Fetching cluster servers from ${address} failed.`, e);
            }
        }
        throw new TypeDBClientError(CLUSTER_UNABLE_TO_CONNECT.message(this._addresses.join(",")));
    }
}

class OpenSessionFailsafeTask extends FailsafeTask<ClusterSession> {
    private readonly _type: SessionType;
    private readonly _options: TypeDBClusterOptions;

    constructor(database: string, type: SessionType, options: TypeDBClusterOptions, client: ClusterClient) {
        super(client, database);
        this._type = type;
        this._options = options;
    }

    run(replica: Database.Replica): Promise<ClusterSession> {
        const session = new ClusterSession(this.client, replica.address);
        return session.open(replica.address, this.database, this._type, this._options);
    }
}
