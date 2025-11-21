import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1700000000000 implements MigrationInterface {
  name = 'InitialMigration1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // Create articles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "articles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "publicationDate" TIMESTAMP NOT NULL,
        "authorId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_articles_id" PRIMARY KEY ("id")
      )
    `);

    // Create foreign key (check if it doesn't exist first)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_articles_author'
        ) THEN
          ALTER TABLE "articles"
          ADD CONSTRAINT "FK_articles_author"
          FOREIGN KEY ("authorId")
          REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    // Create index on authorId for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_articles_authorId" ON "articles" ("authorId")
    `);

    // Create index on publicationDate for filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_articles_publicationDate" ON "articles" ("publicationDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_articles_publicationDate"`);
    await queryRunner.query(`DROP INDEX "IDX_articles_authorId"`);
    await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_articles_author"`);
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
