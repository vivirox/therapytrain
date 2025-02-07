declare module 'mongodb' {
  export interface MongoClientOptions {
    useNewUrlParser?: boolean
    useUnifiedTopology?: boolean
    serverApi?: {
      version: string
      strict?: boolean
      deprecationErrors?: boolean
    }
    auth?: {
      username: string
      password: string
    }
    tls?: boolean
    tlsCAFile?: string
    tlsCertificateKeyFile?: string
    tlsAllowInvalidCertificates?: boolean
    retryWrites?: boolean
    w?: string | number
    wtimeoutMS?: number
    readPreference?: string
    readConcern?: {
      level: string
    }
    maxPoolSize?: number
    minPoolSize?: number
    connectTimeoutMS?: number
    socketTimeoutMS?: number
    family?: number
    keepAlive?: boolean
    keepAliveInitialDelay?: number
    noDelay?: boolean
    ssl?: boolean
    sslCA?: Buffer | string
    sslCert?: Buffer | string
    sslKey?: Buffer | string
    sslPass?: string
    sslValidate?: boolean
    checkServerIdentity?: boolean | ((hostname: string, cert: { subject: { CN: string } }) => Error | undefined)
    replicaSet?: string
    ha?: boolean
    haInterval?: number
    secondaryAcceptableLatencyMS?: number
    acceptableLatencyMS?: number
    connectWithNoPrimary?: boolean
    authSource?: string
    forceServerObjectId?: boolean
    serializeFunctions?: boolean
    ignoreUndefined?: boolean
    raw?: boolean
    promoteLongs?: boolean
    promoteBuffers?: boolean
    promoteValues?: boolean
    domainsEnabled?: boolean
    pkFactory?: {
      createPk(): { toHexString(): string }
    }
    validateOptions?: boolean
    appname?: string
    auth?: {
      user?: string
      password?: string
    }
    authMechanism?: string
    compression?: {
      compressors?: ('snappy' | 'zlib' | 'zstd')[]
    }
    loggerLevel?: string
    logger?: {
      debug(...args: any[]): void
      log(...args: any[]): void
      error(...args: any[]): void
    }
    monitorCommands?: boolean
  }

  export class MongoClient {
    constructor(url: string, options?: MongoClientOptions)
    connect(): Promise<MongoClient>
    close(force?: boolean): Promise<void>
    db(name?: string): Db
    isConnected(): boolean
    static connect(url: string, options?: MongoClientOptions): Promise<MongoClient>
  }

  export class Db {
    collection<TSchema = any>(name: string): Collection<TSchema>
    createCollection<TSchema = any>(name: string, options?: CollectionCreateOptions): Promise<Collection<TSchema>>
    dropCollection(name: string): Promise<boolean>
    listCollections(filter?: object, options?: ListCollectionsOptions): Promise<Collection[]>
  }

  export interface CollectionCreateOptions {
    capped?: boolean
    size?: number
    max?: number
    storageEngine?: object
    validator?: object
    validationLevel?: 'off' | 'strict' | 'moderate'
    validationAction?: 'error' | 'warn'
    indexOptionDefaults?: object
    viewOn?: string
    pipeline?: object[]
    collation?: object
    writeConcern?: {
      w?: number | string
      j?: boolean
      wtimeout?: number
    }
  }

  export interface ListCollectionsOptions {
    batchSize?: number
    nameOnly?: boolean
    authorizedCollections?: boolean
  }

  export class Collection<TSchema = any> {
    insertOne(doc: TSchema, options?: InsertOneOptions): Promise<InsertOneResult<TSchema>>
    insertMany(docs: TSchema[], options?: InsertManyOptions): Promise<InsertManyResult<TSchema>>
    findOne(filter?: FilterQuery<TSchema>, options?: FindOneOptions<TSchema>): Promise<TSchema | null>
    find(filter?: FilterQuery<TSchema>, options?: FindOptions<TSchema>): Cursor<TSchema>
    updateOne(filter: FilterQuery<TSchema>, update: UpdateQuery<TSchema> | TSchema, options?: UpdateOptions): Promise<UpdateResult>
    updateMany(filter: FilterQuery<TSchema>, update: UpdateQuery<TSchema> | TSchema, options?: UpdateOptions): Promise<UpdateResult>
    deleteOne(filter?: FilterQuery<TSchema>, options?: DeleteOptions): Promise<DeleteResult>
    deleteMany(filter?: FilterQuery<TSchema>, options?: DeleteOptions): Promise<DeleteResult>
    countDocuments(filter?: FilterQuery<TSchema>, options?: CountDocumentsOptions): Promise<number>
    distinct(key: string, filter?: FilterQuery<TSchema>, options?: DistinctOptions): Promise<any[]>
    createIndex(fieldOrSpec: string | object, options?: CreateIndexesOptions): Promise<string>
    dropIndex(indexName: string, options?: DropIndexesOptions): Promise<void>
    indexes(options?: ListIndexesOptions): Promise<any[]>
  }

  export interface InsertOneOptions {
    bypassDocumentValidation?: boolean
    forceServerObjectId?: boolean
    w?: number | string
    wtimeout?: number
    j?: boolean
    checkKeys?: boolean
    serializeFunctions?: boolean
    ordered?: boolean
    writeConcern?: object
  }

  export interface InsertManyOptions extends InsertOneOptions {
    ordered?: boolean
  }

  export interface InsertOneResult<TSchema> {
    acknowledged: boolean
    insertedId: any
  }

  export interface InsertManyResult<TSchema> {
    acknowledged: boolean
    insertedCount: number
    insertedIds: { [key: number]: any }
  }

  export interface FilterQuery<TSchema> {
    [key: string]: any
  }

  export interface UpdateQuery<TSchema> {
    $set?: Partial<TSchema>
    $unset?: { [P in keyof TSchema]?: '' }
    $inc?: { [P in keyof TSchema]?: number }
    $push?: { [P in keyof TSchema]?: any | any[] }
    $pull?: { [P in keyof TSchema]?: any }
    [key: string]: any
  }

  export interface UpdateResult {
    acknowledged: boolean
    matchedCount: number
    modifiedCount: number
    upsertedCount: number
    upsertedId: any
  }

  export interface DeleteResult {
    acknowledged: boolean
    deletedCount: number
  }

  export interface FindOneOptions<TSchema> {
    limit?: number
    sort?: { [key: string]: 1 | -1 }
    projection?: { [P in keyof TSchema]?: 0 | 1 }
    skip?: number
    collation?: object
  }

  export interface FindOptions<TSchema> extends FindOneOptions<TSchema> {
    batchSize?: number
    hint?: string | object
    max?: object
    maxTimeMS?: number
    min?: object
    readConcern?: { level: string }
    returnKey?: boolean
    session?: ClientSession
    showRecordId?: boolean
    tailable?: boolean
    oplogReplay?: boolean
    noCursorTimeout?: boolean
    awaitData?: boolean
    allowPartialResults?: boolean
  }

  export interface UpdateOptions {
    upsert?: boolean
    w?: number | string
    wtimeout?: number
    j?: boolean
    bypassDocumentValidation?: boolean
    arrayFilters?: object[]
    session?: ClientSession
  }

  export interface DeleteOptions {
    w?: number | string
    wtimeout?: number
    j?: boolean
    session?: ClientSession
  }

  export interface CountDocumentsOptions {
    limit?: number
    skip?: number
    hint?: string | object
    maxTimeMS?: number
  }

  export interface DistinctOptions {
    readPreference?: string | object
    maxTimeMS?: number
    session?: ClientSession
  }

  export interface CreateIndexesOptions {
    unique?: boolean
    sparse?: boolean
    background?: boolean
    expireAfterSeconds?: number
    storageEngine?: object
    weights?: object
    default_language?: string
    language_override?: string
    textIndexVersion?: number
    '2dsphereIndexVersion'?: number
    bits?: number
    min?: number
    max?: number
    bucketSize?: number
    partialFilterExpression?: object
    collation?: object
    wildcardProjection?: object
    hidden?: boolean
  }

  export interface DropIndexesOptions {
    w?: number | string
    wtimeout?: number
    j?: boolean
    session?: ClientSession
    maxTimeMS?: number
  }

  export interface ListIndexesOptions {
    batchSize?: number
    maxTimeMS?: number
    session?: ClientSession
  }

  export interface ClientSession {
    endSession(): Promise<void>
    abortTransaction(): Promise<void>
    commitTransaction(): Promise<void>
    withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T>
  }

  export class Cursor<TSchema = any> {
    toArray(): Promise<TSchema[]>
    forEach(fn: (doc: TSchema) => void): Promise<void>
    map<T>(fn: (doc: TSchema) => T): Cursor<T>
    hasNext(): Promise<boolean>
    next(): Promise<TSchema | null>
    close(): Promise<void>
    count(options?: CountDocumentsOptions): Promise<number>
    limit(value: number): Cursor<TSchema>
    skip(value: number): Cursor<TSchema>
    sort(keyOrList: string | object, direction?: 1 | -1): Cursor<TSchema>
  }

  export class ObjectId {
    constructor(id?: string | number | ObjectId)
    toHexString(): string
    toString(): string
    toJSON(): string
    equals(otherId: string | ObjectId | Buffer): boolean
    getTimestamp(): Date
    static createFromTime(time: number): ObjectId
    static createFromHexString(hexString: string): ObjectId
    static isValid(id: string | number | ObjectId | Buffer): boolean
  }
} 