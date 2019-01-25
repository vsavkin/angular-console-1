"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var schematics_1 = require("@angular-devkit/schematics");
var ast_utils_1 = require("@nrwl/schematics/src/utils/ast-utils");
var core_1 = require("@angular-devkit/core");
var child_process_1 = require("child_process");
var path_1 = require("path");
function getDbConfigEnvName(schema) {
    return "AZURE_COSMOS_" + schema.project.toUpperCase() + "_" + schema.azureDbName.toUpperCase();
}
function updateDotEnvFile(schema) {
    return function (host) {
        var env = host.read('.env');
        var dbInfo = JSON.parse(child_process_1.execSync("az cosmosdb list").toString()).find(function (db) { return db.name === schema.azureDbName; });
        var cs = JSON.parse(child_process_1.execSync("az cosmosdb list-connection-strings --ids=" + dbInfo.id).toString()).connectionStrings[0].connectionString;
        var _a = cs.split('://'), prefix = _a[0], suffix = _a[1];
        var _b = suffix.split('@'), credentials = _b[0], url = _b[1];
        var _c = credentials.split(':'), username = _c[0], password = _c[1];
        var encodedCs = prefix + "://" + username + ":" + encodeURIComponent(password) + "@" + url;
        var dbConfig = getDbConfigEnvName(schema) + "=" + encodedCs;
        var newEnv = env.length > 0 ? env + "\n" + dbConfig : dbConfig;
        host.overwrite('.env', newEnv);
    };
}
function updateEnvFiles(schema) {
    return function (host) {
        var sourceRoot = ast_utils_1.getProjectConfig(host, schema.project).sourceRoot;
        var dev = host.getDir(sourceRoot + "/environments").file(core_1.fragment('environment.ts'));
        host.overwrite(dev.path, "\n// This file can be replaced during build by using the `fileReplacements` array.\n// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.\n// The list of file replacements can be found in `angular.json`.\n\nexport const environment = {\n  production: false,\n  database: {\n    connectionString: 'mongodb://localhost:27017/devdb'\n  }\n};\n");
        var prod = host.getDir(sourceRoot + "/environments").file(core_1.fragment('environment.prod.ts'));
        host.overwrite(prod.path, "\nexport const environment = {\n  production: true,\n  database: {\n    connectionString: process.env." + getDbConfigEnvName(schema) + "\n  }\n};\n");
    };
}
function updateAppModule(schema) {
    return function (host) {
        var sourceRoot = ast_utils_1.getProjectConfig(host, schema.project).sourceRoot;
        host.overwrite(path_1.join(sourceRoot, 'app', 'app.module.ts'), "\nimport { Module } from '@nestjs/common';\nimport { MondoDbModule } from '@nrwl/azure';\n\nimport { AppController } from './app.controller';\nimport { AppService } from './app.service';\nimport { environment } from '../environments/environment';\n\n\n@Module({\n  imports: [\n    MondoDbModule.forRoot(environment)\n  ],\n  controllers: [AppController],\n  providers: [AppService],\n})\nexport class AppModule {}\n    ");
    };
}
function registerDockerMongo(schema) {
    return function (host, context) {
        var project = ast_utils_1.getProjectConfig(host, schema.project);
        project.architect.mongodb = {
            'builder': '@nrwl/builders:run-commands',
            'options': {
                commands: [
                    { command: 'powershell.exe docker run -d -p 27017:27017 mongo' }
                ]
            }
        };
        project.architect.serve.options.runTargets = [
            {
                target: schema.project + ":mongodb"
            }
        ];
        ast_utils_1.updateProjectConfig(schema.project, project)(host, context);
    };
}
function default_1(schema) {
    return schematics_1.chain([
        schematics_1.branchAndMerge(schematics_1.chain([
            updateDotEnvFile(schema),
            updateEnvFiles(schema),
            updateAppModule(schema),
            registerDockerMongo(schema)
        ]))
    ]);
}
exports.default = default_1;
