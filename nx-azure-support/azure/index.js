"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("@nestjs/common");
var mongodb_1 = require("mongodb");
var MongoDb = /** @class */ (function () {
    function MongoDb(connection) {
        this.connection = connection;
    }
    MongoDb.prototype.findAll = function (collectionName) {
        var _this = this;
        return new Promise(function (res) {
            mongodb_1.MongoClient.connect(_this.connection, function (err, client) {
                if (err)
                    throw err;
                var db = client.db('devdb');
                db.collection(collectionName).find({}).toArray(function (err, docs) {
                    if (err)
                        throw err;
                    res(docs);
                });
                client.close();
            });
        });
    };
    MongoDb.prototype.insert = function (collectionName, value) {
        var _this = this;
        return new Promise(function (res) {
            mongodb_1.MongoClient.connect(_this.connection, function (err, client) {
                if (err)
                    throw err;
                var db = client.db('devdb');
                db.collection(collectionName).insertMany([value], function (err, r) {
                    if (err)
                        throw err;
                    res(r);
                });
                client.close();
            });
        });
    };
    MongoDb = __decorate([
        common_1.Injectable(),
        __metadata("design:paramtypes", [String])
    ], MongoDb);
    return MongoDb;
}());
exports.MongoDb = MongoDb;
var MondoDbModule = /** @class */ (function () {
    function MondoDbModule() {
    }
    MondoDbModule_1 = MondoDbModule;
    MondoDbModule.forRoot = function (options) {
        return {
            module: MondoDbModule_1,
            providers: [
                {
                    provide: MongoDb,
                    useFactory: function () { return new MongoDb(options.database.connectionString); },
                    deps: []
                },
            ],
            exports: [MongoDb]
        };
    };
    var MondoDbModule_1;
    MondoDbModule = MondoDbModule_1 = __decorate([
        common_1.Module({})
    ], MondoDbModule);
    return MondoDbModule;
}());
exports.MondoDbModule = MondoDbModule;
