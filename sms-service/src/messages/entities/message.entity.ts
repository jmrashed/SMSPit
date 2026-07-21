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

  // Populated by MessagesService calling ai-service's /detect-otp on
  // capture (Day 68) -- null when no OTP was detected or ai-service
  // was unreachable (detection is best-effort, never blocks capture).
  @Column({ type: 'varchar', nullable: true })
  otp: string | null;

  // Populated by MessagesService calling ai-service's /classify on
  // capture (Day 71) -- one of otp/transactional/marketing/other, null
  // when ai-service was unreachable.
  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  // Populated by MessagesService calling ai-service's /detect-spam on
  // capture (Day 73); also the target of the manual "mark as not spam"
  // override endpoint. Null when ai-service was unreachable.
  @Column({ name: 'is_spam', type: 'boolean', nullable: true })
  isSpam: boolean | null;

  // Laravel's Schema::enum() on Postgres creates a varchar column with a
  // CHECK constraint, not a native Postgres enum type -- map it as varchar
  // here to match the actual column type from the auth-service migration.
  @Column({ type: 'varchar' })
  status: MessageStatus;

  @Column({ name: 'replayed_from', type: 'varchar', nullable: true })
  replayedFrom: string | null;

  // NULL means "ungrouped" (pre-multi-tenancy data, or a key with no
  // org_id) -- treated as its own bucket by query scoping, not a
  // wildcard that matches every organization. See docs/multi-tenancy.md.
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId: number | null;

  @Column({ name: 'created_at' })
  createdAt: Date;
}
