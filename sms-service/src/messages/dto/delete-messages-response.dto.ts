export class DeleteMessagesResponseDto {
  deleted_count: number;

  constructor(deletedCount: number) {
    this.deleted_count = deletedCount;
  }
}
