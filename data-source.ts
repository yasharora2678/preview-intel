import { ConfigService } from "@nestjs/config";
import { getTypeOrmConfig } from "ormconfig";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource(getTypeOrmConfig(new ConfigService()));