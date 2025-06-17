#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertSchema = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const convertSchema = (name, schema) => {
    const { customFields, apiFields } = schema;
    const customs = Object.fromEntries(customFields.map(({ fieldId, createdAt }) => [createdAt, fieldId]));
    const getKindType = (fields) => {
        var _a;
        const { kind, required } = fields;
        const types = {
            text: () => 'string',
            textArea: () => 'string',
            richEditor: () => 'string',
            number: () => 'number',
            select: () => {
                const { selectItems: list, multipleSelect } = fields;
                const str = list.reduce((a, rep, index) => `${a}${index ? ' | ' : ''}'${rep.value}'`, '');
                if (multipleSelect)
                    return list.length > 1 ? `(${str})[]` : `${str}[]`;
                return `[${str}]`;
            },
            relation: () => (required ? 'Reference<T,unknown>' : 'Reference<T,unknown | null>'),
            relationList: () => 'Reference<T,unknown>[]',
            boolean: () => 'boolean',
            date: () => 'string',
            media: () => 'MediaType',
            mediaList: () => 'MediaType[]',
            file: () => '{ url: string }',
            custom: () => `${name}_${customs[fields.customFieldCreatedAt]}`,
            repeater: () => {
                const { customFieldCreatedAtList: list } = fields;
                const str = list.reduce((a, rep, index) => `${a}${index ? ' | ' : ''}${name}_${customs[rep]}`, '');
                return list.length > 1 ? `(${str})[]` : `${str}[]`;
            },
        };
        return ((_a = types[kind]) === null || _a === void 0 ? void 0 : _a.call(types)) || 'any';
    };
    const getDoc = (field) => {
        return `/**\n * ${field.name}\n */`;
    };
    const getFields = (fields) => {
        return fields.map((fields) => {
            const { fieldId, required } = fields;
            return `${getDoc(fields)}\n${fieldId}${!required ? '?' : ''}: ${getKindType(fields)}`;
        });
    };
    const getCustomFields = (fieldId, fields) => {
        return [`fieldId: '${fieldId}'`, ...getFields(fields)];
    };
    const mainSchema = getFields(apiFields);
    const customSchemas = Object.fromEntries(customFields.map(({ fieldId, fields }) => [fieldId, getCustomFields(fieldId, fields)]));
    return { mainSchema, customSchemas };
};
exports.convertSchema = convertSchema;
const outSchema = (name, { mainSchema, customSchemas }) => {
    let buffer = `export type ${(0, utils_1.camelCase)(name)}<T='get'> = Structure<\nT,\n{\n`;
    mainSchema.forEach((field) => {
        field.split('\n').forEach((s) => (buffer += `  ${s}\n`));
    });
    buffer += '}>\n\n';
    Object.entries(customSchemas).forEach(([customName, fields]) => {
        buffer += `interface ${name}_${customName} {\n`;
        fields.forEach((field) => {
            field.split('\n').forEach((s) => (buffer += `  ${s}\n`));
        });
        buffer += '}\n';
    });
    return buffer;
};
const main = (dir, dest) => {
    const files = fs_1.default.readdirSync(dir);
    const typeNames = new Map();
    Array.from(files)
        .reverse()
        .forEach((file) => {
        var _a;
        const name = (_a = file.match(/api-(.*)-.*\.json/)) === null || _a === void 0 ? void 0 : _a[1];
        if (!name || typeNames.has(name))
            return false;
        typeNames.set(name, file);
        return true;
    });
    let output = `type Reference<T, R> = T extends 'get' ? R : string | null;
interface GetsType<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}
type DateType = {
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
};
type MediaType = {
  url: string;
  width: number;
  height: number;
}
type Structure<T, P> = T extends 'get'
  ? { id: string } & DateType & Required<P>
  : T extends 'gets'
  ? GetsType<{ id: string } & DateType & Required<P>>
  : Partial<DateType> & (T extends 'patch' ? Partial<P> : P);\n\n`;
    typeNames.forEach(async (file, name) => {
        const schema = fs_1.default.readFileSync(path_1.default.resolve(dir, file));
        const s = (0, exports.convertSchema)(name, JSON.parse(schema.toString()));
        output += outSchema(name, s);
    });
    output += `\nexport interface EndPoints {\n`;
    ['get', 'gets', 'post', 'put', 'patch'].forEach((method) => {
        output += `  ${method}: {\n`;
        typeNames.forEach((_, name) => {
            output += `    '${name}': ${(0, utils_1.camelCase)(name)}<'${method}'>\n`;
        });
        output += '  }\n';
    });
    output += '}\n';
    if (dest)
        fs_1.default.writeFileSync(dest, output);
    else
        console.log(output);
};
if (process.argv.length < 3) {
    console.log('microcms-typescript src-dir [dist-file]');
}
else {
    main(process.argv[2], process.argv[3]);
}
