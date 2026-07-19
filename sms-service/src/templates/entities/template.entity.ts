import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Maps to the `templates` table. Schema/migrations are owned by
// auth-service (see docs/architecture.md#database-migrations) -- this
// entity must never run its own migrations or synchronize.
@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  body: string;

  // Postgres json column; TypeORM maps it to/from a plain string array.
  @Column({ type: 'json' })
  variables: string[];

  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId: number | null;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at' })
  updatedAt: Date;
}
