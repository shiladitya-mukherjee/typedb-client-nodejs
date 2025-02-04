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

import {Type as TypeProto} from "typedb-protocol/common/concept_pb";
import {Thing} from "../../api/concept/thing/Thing";
import {AttributeType} from "../../api/concept/type/AttributeType";
import {RoleType} from "../../api/concept/type/RoleType";
import {ThingType} from "../../api/concept/type/ThingType";
import {TypeDBTransaction} from "../../api/connection/TypeDBTransaction";
import {ErrorMessage} from "../../common/errors/ErrorMessage";
import {TypeDBClientError} from "../../common/errors/TypeDBClientError";
import {Label} from "../../common/Label";
import {RequestBuilder} from "../../common/rpc/RequestBuilder";
import {Stream} from "../../common/util/Stream";
import {
    AttributeTypeImpl,
    EntityTypeImpl,
    RelationTypeImpl,
    RoleTypeImpl,
    ThingImpl,
    TypeImpl
} from "../../dependencies_internal";
import BAD_ENCODING = ErrorMessage.Concept.BAD_ENCODING;
import Annotation = ThingType.Annotation;
import {Concept} from "../../api/concept/Concept";

export class ThingTypeImpl extends TypeImpl implements ThingType {

    constructor(name: string, root: boolean, abstract: boolean) {
        super(Label.of(name), root, abstract);
    }

    protected get className(): string {
        return "ThingType";
    }

    asRemote(transaction: TypeDBTransaction): ThingType.Remote {
        return new ThingTypeImpl.Remote(transaction as TypeDBTransaction.Extended, this.label, this.root, this.abstract);
    }

    isThingType(): boolean {
        return true;
    }

    asThingType(): ThingType {
        return this;
    }
}

export namespace ThingTypeImpl {


    export function of(thingTypeProto: TypeProto) {
        if (!thingTypeProto) return null;
        switch (thingTypeProto.getEncoding()) {
            case TypeProto.Encoding.ENTITY_TYPE:
                return EntityTypeImpl.of(thingTypeProto);
            case TypeProto.Encoding.RELATION_TYPE:
                return RelationTypeImpl.of(thingTypeProto);
            case TypeProto.Encoding.ATTRIBUTE_TYPE:
                return AttributeTypeImpl.of(thingTypeProto);
            case TypeProto.Encoding.THING_TYPE:
                return new ThingTypeImpl(thingTypeProto.getLabel(), thingTypeProto.getIsRoot(), thingTypeProto.getIsAbstract());
            default:
                throw new TypeDBClientError(BAD_ENCODING.message(thingTypeProto.getEncoding()));
        }
    }

    export class Remote extends TypeImpl.Remote implements ThingType.Remote {

        constructor(transaction: TypeDBTransaction.Extended, label: Label, root: boolean, abstract: boolean) {
            super(transaction, label, root, abstract);
        }

        protected get className(): string {
            return "ThingType";
        }

        asRemote(transaction: TypeDBTransaction): ThingType.Remote {
            return new ThingTypeImpl.Remote(transaction as TypeDBTransaction.Extended, this.label, this.root, this.abstract);
        }

        isThingType(): boolean {
            return true;
        }

        asThingType(): ThingType.Remote {
            return this;
        }

        getSubtypes(): Stream<ThingType> {
            return super.getSubtypes() as Stream<ThingType>;
        }

        getSupertype(): Promise<ThingType> {
            return super.getSupertype() as Promise<ThingType>;
        }

        getSupertypes(): Stream<ThingType> {
            return super.getSupertypes() as Stream<ThingType>;
        }

        getInstances(): Stream<Thing> {
            const request = RequestBuilder.Type.ThingType.getInstancesReq(this.label);
            return this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getThingTypeGetInstancesResPart().getThingsList()))
                .map((thingProto) => ThingImpl.of(thingProto));
        }

        getOwns(): Stream<AttributeType>;
        getOwns(valueType: Concept.ValueType): Stream<AttributeType>;
        getOwns(annotations: Annotation[]): Stream<AttributeType>;
        getOwns(valueType: Concept.ValueType, annotations: Annotation[]): Stream<AttributeType>;
        getOwns(valueTypeOrAnnotationsOnly?: Concept.ValueType | Annotation[], annotations?: Annotation[]): Stream<AttributeType> {
            let request;
            if (!valueTypeOrAnnotationsOnly) {
                request = RequestBuilder.Type.ThingType.getOwnsReq(this.label, []);
            } else if (Array.isArray(valueTypeOrAnnotationsOnly)) {
                request = RequestBuilder.Type.ThingType.getOwnsReq(
                    this.label, (valueTypeOrAnnotationsOnly as Annotation[]).map(a => ThingType.Annotation.proto(a))
                );
            } else if (!annotations) {
                request = RequestBuilder.Type.ThingType.getOwnsByTypeReq(
                    this.label, (valueTypeOrAnnotationsOnly as Concept.ValueType).proto(), []
                );
            } else {
                request = RequestBuilder.Type.ThingType.getOwnsByTypeReq(
                    this.label, (valueTypeOrAnnotationsOnly as Concept.ValueType).proto(),
                    annotations.map(a => ThingType.Annotation.proto(a))
                );
            }
            return this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getThingTypeGetOwnsResPart().getAttributeTypesList()))
                .map((attributeTypeProto) => AttributeTypeImpl.of(attributeTypeProto));
        }


        getOwnsExplicit(): Stream<AttributeType>;
        getOwnsExplicit(valueType: Concept.ValueType): Stream<AttributeType>;
        getOwnsExplicit(annotations: Annotation[]): Stream<AttributeType>;
        getOwnsExplicit(valueType: Concept.ValueType, annotations: Annotation[]): Stream<AttributeType>;
        getOwnsExplicit(valueTypeOrAnnotationsOnly?: Concept.ValueType | Annotation[], annotations?: Annotation[]): Stream<AttributeType> {
            let request;
            if (!valueTypeOrAnnotationsOnly) {
                request = RequestBuilder.Type.ThingType.getOwnsExplicitReq(this.label, []);
            } else if (Array.isArray(valueTypeOrAnnotationsOnly)) {
                request = RequestBuilder.Type.ThingType.getOwnsExplicitReq(
                    this.label, (valueTypeOrAnnotationsOnly as Annotation[]).map(a => ThingType.Annotation.proto(a))
                );
            } else if (!annotations) {
                request = RequestBuilder.Type.ThingType.getOwnsExplicitByTypeReq(
                    this.label, (valueTypeOrAnnotationsOnly as Concept.ValueType).proto(), []
                );
            } else {
                request = RequestBuilder.Type.ThingType.getOwnsExplicitByTypeReq(
                    this.label, (valueTypeOrAnnotationsOnly as Concept.ValueType).proto(),
                    annotations.map(a => ThingType.Annotation.proto(a))
                );
            }
            return this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getThingTypeGetOwnsExplicitResPart().getAttributeTypesList()))
                .map((attributeTypeProto) => AttributeTypeImpl.of(attributeTypeProto));
        }

        async getOwnsOverridden(attributeType: AttributeType): Promise<AttributeType> {
            const req = RequestBuilder.Type.ThingType.getOwnsOverriddenReq(this.label, ThingType.proto(attributeType));
            return this.execute(req)
                .then((res) => AttributeTypeImpl.of(res.getThingTypeGetOwnsOverriddenRes().getAttributeType()));
        }

        async setOwns(attributeType: AttributeType): Promise<void>;
        async setOwns(attributeType: AttributeType, annotations: Annotation[]): Promise<void>;
        async setOwns(attributeType: AttributeType, overriddenType: AttributeType): Promise<void>;
        async setOwns(attributeType: AttributeType, overriddenTypeOrAnnotations?: AttributeType | Annotation[], annotations?: Annotation[]): Promise<void> {
            let request;
            if (!overriddenTypeOrAnnotations) {
                request = RequestBuilder.Type.ThingType.setOwnsReq(this.label, ThingType.proto(attributeType), []);
            } else if (Array.isArray(overriddenTypeOrAnnotations)) {
                request = RequestBuilder.Type.ThingType.setOwnsReq(this.label, ThingType.proto(attributeType),
                    (overriddenTypeOrAnnotations as Annotation[]).map(a => ThingType.Annotation.proto(a))
                );
            } else if (!annotations) {
                request = RequestBuilder.Type.ThingType.setOwnsOverriddenReq(
                    this.label, ThingType.proto(attributeType),
                    ThingType.proto((overriddenTypeOrAnnotations as AttributeType)),
                    []
                );
            } else {
                request = RequestBuilder.Type.ThingType.setOwnsOverriddenReq(
                    this.label, ThingType.proto(attributeType),
                    ThingType.proto(overriddenTypeOrAnnotations as AttributeType),
                    annotations.map(a => ThingType.Annotation.proto(a))
                );
            }
            await this.execute(request);
        }

        async unsetOwns(attributeType: AttributeType): Promise<void> {
            const request = RequestBuilder.Type.ThingType.unsetOwnsReq(this.label, ThingType.proto(attributeType));
            await this.execute(request);
        }

        getPlays(): Stream<RoleType> {
            const request = RequestBuilder.Type.ThingType.getPlaysReq(this.label);
            return this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getThingTypeGetPlaysResPart().getRoleTypesList()))
                .map((roleProto) => RoleTypeImpl.of(roleProto));
        }

        getPlaysExplicit(): Stream<RoleType> {
            const request = RequestBuilder.Type.ThingType.getPlaysExplicitReq(this.label);
            return this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getThingTypeGetPlaysExplicitResPart().getRoleTypesList()))
                .map((roleProto) => RoleTypeImpl.of(roleProto));
        }

        async getPlaysOverridden(role: RoleType): Promise<RoleType> {
            const request = RequestBuilder.Type.ThingType.getPlaysOverriddenReq(this.label);
            return this.execute(request)
                .then((res) => RoleTypeImpl.of(res.getThingTypeGetPlaysOverriddenRes().getRoleType()));
        }

        async setPlays(role: RoleType): Promise<void>;
        async setPlays(role: RoleType, overriddenType?: RoleType): Promise<void> {
            let request;
            if (!overriddenType) {
                request = RequestBuilder.Type.ThingType.setPlaysReq(this.label, RoleType.proto(role));
            } else {
                request = RequestBuilder.Type.ThingType.setPlaysOverriddenReq(this.label, RoleType.proto(role), RoleType.proto(overriddenType));
            }
            await this.execute(request);
        }

        async unsetPlays(role: RoleType): Promise<void> {
            const request = RequestBuilder.Type.ThingType.unsetPlaysReq(this.label, RoleType.proto(role));
            await this.execute(request);
        }

        async setAbstract(): Promise<void> {
            const request = RequestBuilder.Type.ThingType.setAbstractReq(this.label);
            await this.execute(request);
        }

        async unsetAbstract(): Promise<void> {
            const request = RequestBuilder.Type.ThingType.unsetAbstractReq(this.label);
            await this.execute(request);
        }

        async isDeleted(): Promise<boolean> {
            return (await this.transaction.concepts.getThingType(this.label.name)) != null;
        }

        protected async setSupertype(thingType: ThingType): Promise<void> {
            const request = RequestBuilder.Type.ThingType.setSupertypeReq(this.label, ThingType.proto(thingType));
            await this.execute(request);
        }

        async getSyntax(): Promise<string> {
            const request = RequestBuilder.Type.ThingType.getSyntaxReq(this.label);
            return (await this.execute(request)).getThingTypeGetSyntaxRes().getSyntax();
        }
    }
}
