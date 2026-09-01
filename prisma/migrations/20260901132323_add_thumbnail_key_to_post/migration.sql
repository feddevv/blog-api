/*
  Warnings:

  - You are about to drop the column `imageKey` on the `Post` table. All the data in the column will be lost.
  - Added the required column `coverImageKey` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnailKey` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "imageKey",
ADD COLUMN     "coverImageKey" TEXT NOT NULL,
ADD COLUMN     "thumbnailKey" TEXT NOT NULL;
