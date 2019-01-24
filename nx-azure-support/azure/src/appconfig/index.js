"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var schematics_1 = require("@angular-devkit/schematics");
var ast_utils_1 = require("@nrwl/schematics/src/utils/ast-utils");
var path_1 = require("path");
function generateFiles(schema) {
    return function (host) {
        var project = ast_utils_1.getProjectConfig(host, schema.project);
        var templateSource = schematics_1.apply(schematics_1.url('./files'), [
            schematics_1.template(schema),
            schematics_1.move(path_1.join(project.sourceRoot, 'azure', schema.environment))
        ]);
        return schematics_1.mergeWith(templateSource);
    };
}
function registerBuilder(schema) {
    return function (host, context) {
        var _a;
        var project = ast_utils_1.getProjectConfig(host, schema.project);
        project.architect.deploy = {
            'builder': '@nrwl/azure:deploy',
            'options': {
                "buildTarget": schema.project + ":build:production"
            },
            'configurations': (_a = {},
                _a[schema.environment] = {
                    'azureWebAppName': schema.azureWebAppName,
                    'deployment': {
                        type: 'git',
                        remote: "https://" + schema.azureWebAppName + ".scm.azurewebsites.net:443/" + schema.azureWebAppName + ".git"
                    }
                },
                _a)
        };
        ast_utils_1.updateProjectConfig(schema.project, project)(host, context);
    };
}
function default_1(schema) {
    return schematics_1.chain([
        schematics_1.branchAndMerge(schematics_1.chain([
            generateFiles(schema),
            registerBuilder(schema)
        ]))
    ]);
}
exports.default = default_1;
