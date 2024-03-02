import { Module } from '@nestjs/common';
import { PG_CONNECTION } from "../constants";
import { Pool } from 'pg'

const dbProvider = {
  provide: PG_CONNECTION,
  useValue: new Pool({
    connectionString: 'postgres://default:VJL4ihQG1vjb@ep-icy-snowflake-a44gyaz2.us-east-1.aws.neon.tech:5432/verceldb?sslmode=require'
  })
}
@Module({
  providers: [dbProvider],
  exports: [dbProvider]
})
export class DbModule {}
