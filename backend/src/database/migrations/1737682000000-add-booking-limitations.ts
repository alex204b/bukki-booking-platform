import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBookingLimitations1737682000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add booking limitation columns to services table
    await queryRunner.addColumn(
      'services',
      new TableColumn({
        name: 'maxBookingsPerCustomerPerDay',
        type: 'int',
        default: 1,
      }),
    );

    await queryRunner.addColumn(
      'services',
      new TableColumn({
        name: 'maxBookingsPerCustomerPerWeek',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'services',
      new TableColumn({
        name: 'bookingCooldownHours',
        type: 'int',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'services',
      new TableColumn({
        name: 'allowMultipleActiveBookings',
        type: 'boolean',
        default: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('services', 'maxBookingsPerCustomerPerDay');
    await queryRunner.dropColumn('services', 'maxBookingsPerCustomerPerWeek');
    await queryRunner.dropColumn('services', 'bookingCooldownHours');
    await queryRunner.dropColumn('services', 'allowMultipleActiveBookings');
  }
}

