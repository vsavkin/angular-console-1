export declare class MongoDb {
    private readonly connection;
    constructor(connection: string);
    findAll(collectionName: string): Promise<{}>;
    insert(collectionName: string, value: any): Promise<{}>;
}
export declare class MondoDbModule {
    static forRoot(options: {
        database: {
            connectionString: string;
        };
    }): {
        module: typeof MondoDbModule;
        providers: {
            provide: typeof MongoDb;
            useFactory: () => MongoDb;
            deps: any[];
        }[];
        exports: (typeof MongoDb)[];
    };
}
