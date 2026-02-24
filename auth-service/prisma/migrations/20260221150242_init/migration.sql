/*
  Warnings:

  - A unique constraint covering the columns `[telegram_id]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "roles" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "role" "roles" NOT NULL DEFAULT 'USER',
ADD COLUMN     "telegram_id" TEXT;

-- CreateTable
CREATE TABLE "pending_contact_changes" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_contact_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_contact_changes_account_id_type_key" ON "pending_contact_changes"("account_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_telegram_id_key" ON "accounts"("telegram_id");

-- AddForeignKey
ALTER TABLE "pending_contact_changes" ADD CONSTRAINT "pending_contact_changes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
