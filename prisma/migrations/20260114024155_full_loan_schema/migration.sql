-- CreateTable
CREATE TABLE "external_loans" (
    "id" SERIAL NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "product" TEXT NOT NULL,
    "institution" TEXT,
    "loanAmount" DECIMAL(15,2) NOT NULL,
    "outstanding" DECIMAL(15,2) NOT NULL,
    "interestRatePa" DECIMAL(5,2),
    "termMonths" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "monthlyInstallment" DECIMAL(15,2),
    "overdueDays" INTEGER DEFAULT 0,
    "creditClass" TEXT,
    "checkDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_loans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "external_loans" ADD CONSTRAINT "external_loans_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
