import { Column, Entity, PrimaryColumn } from 'typeorm';

export enum MessageStatus {
  CAPTURED = 'captured',
  FAILED = 'failed',
}

// Maps to the `messages` table. Schema/migrations are owned by
// auth-service (see docs/architecture.md#database-migrations) --
// this entity must never run its own migrations or synchronize.
@Entity('messages')
export class Message {
  @PrimaryColumn()
  id: string;

  @Column()
  to: string;

  @Column()
  from: string;

  @Column()
  body: string;

  // Laravel's Schema::enum() on Postgres creates a varchar column with a
  // CHECK constraint, not a native Postgres enum type -- map it as varchar
  // here to match the actual column type from the auth-service migration.
  @Column({ type: 'varchar' })
  status: MessageStatus;

  @Column({ name: 'created_at' })
  createdAt: Date;
}
