-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ApprovalStep" AS ENUM ('PENDING_VERIFIER', 'PENDING_DCO', 'PENDING_CEO', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."CreditGrade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "public"."CustomerType" AS ENUM ('NEW', 'EXISTING');

-- CreateEnum
CREATE TYPE "public"."IncomeEvidenceType" AS ENUM ('BANK_STATEMENT', 'PAY_SLIP', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LoanStatus" AS ENUM ('PENDING', 'PENDING_VERIFIER', 'PENDING_DCO', 'PENDING_CEO', 'APPROVED', 'REJECTED', 'RETURNED', 'DISBURSED', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."LoanType" AS ENUM ('PERSONAL_SALARY_GUARANTEE', 'PERSONAL_WITH_COLLATERAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "public"."MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CREDIT_OFFICER', 'VERIFIER', 'DCO_APPROVER', 'CEO_APPROVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Title" AS ENUM ('THAO', 'NANG');

-- CreateTable
CREATE TABLE "public"."ApprovalHistory" (
    "id" SERIAL NOT NULL,
    "assessmentId" INTEGER NOT NULL,
    "approverId" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assessments" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "creditScore" INTEGER,
    "dtiRatio" DECIMAL(5,2) NOT NULL,
    "dtiThreshold" DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    "ltvRatio" DECIMAL(5,2),
    "ltvThreshold" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "installmentAmount" DECIMAL(15,2) NOT NULL,
    "currInstallToFina" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "exisInstallToFina" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payInstallToOther" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalInstallment" DECIMAL(15,2) NOT NULL,
    "totalNetIncome" DECIMAL(15,2) NOT NULL,
    "endingNetIncome" DECIMAL(15,2) NOT NULL,
    "totalInterest" DECIMAL(15,2) NOT NULL,
    "totalPrincipalPlusInterest" DECIMAL(15,2) NOT NULL,
    "maxApprovedAmount" DECIMAL(15,2),
    "finalApprovalStatus" "public"."LoanStatus" NOT NULL DEFAULT 'PENDING',
    "currentApprovalStep" "public"."ApprovalStep" DEFAULT 'PENDING_VERIFIER',
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preparerComments" TEXT,
    "verifierId" INTEGER,
    "verifierComments" TEXT,
    "dcoId" INTEGER,
    "dcoComments" TEXT,
    "ceoId" INTEGER,
    "ceoComments" TEXT,
    "assessedById" INTEGER,
    "approvedById" INTEGER,
    "operExpSalesRatio" DECIMAL(5,2),
    "cogsSalesRatio" DECIMAL(5,2),
    "gpSalesRatio" DECIMAL(5,2),
    "npSalesRatio" DECIMAL(5,2),
    "existingMonthlyInstallment" DECIMAL(15,2),
    "totalMonthlyInstallment" DECIMAL(15,2),
    "processingFeeAmount" DECIMAL(15,2),
    "sectorRiskLevel" TEXT,
    "sectorSmfV3Used" DECIMAL(65,30),
    "riskAdjustmentFactor" DECIMAL(65,30),
    "sectorNameAtAssessment" TEXT,
    "subSectorAtAssessment" TEXT,
    "bolCodeAtAssessment" TEXT,
    "smfV3AtAssessment" DECIMAL(65,30),
    "monthlyPrincipal" DECIMAL(15,2),
    "monthlyInterest" DECIMAL(15,2),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "changes" JSONB,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."borrower_incomes" (
    "id" SERIAL NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "monthYear" TEXT NOT NULL,
    "grossIncome" DECIMAL(15,2) NOT NULL,
    "netIncome" DECIMAL(15,2) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrower_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."borrowers" (
    "id" SERIAL NOT NULL,
    "laoFirstName" TEXT NOT NULL,
    "laoLastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" "public"."Title" NOT NULL,
    "age" INTEGER NOT NULL,
    "maritalStatus" "public"."MaritalStatus",
    "nationality" TEXT NOT NULL DEFAULT 'Lao',
    "education" TEXT,
    "occupation" TEXT,
    "employerName" TEXT,
    "position" TEXT,
    "workingStartDate" TIMESTAMP(3),
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "idCardExpiryDate" TIMESTAMP(3),
    "village" TEXT,
    "provinceId" INTEGER,
    "districtId" INTEGER,
    "currentAddressLink" TEXT,
    "certificateType" TEXT,
    "certificateNo" TEXT,
    "monthlySalary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "householdExpense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netIncome" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "relationshipWithFina" TEXT DEFAULT 'No relationship',
    "companyProvinceId" INTEGER,
    "companyDistrictId" INTEGER,
    "companyVillage" TEXT,
    "companyAddressLink" TEXT,
    "companyPhone" TEXT,
    "businessRegistrationNumber" TEXT,
    "businessRegisterName" TEXT,
    "businessType" TEXT,
    "businessVillage" TEXT,
    "businessProvinceId" INTEGER,
    "businessDistrictId" INTEGER,
    "businessAddressLink" TEXT,
    "businessPhone" TEXT,
    "employeeCount" INTEGER,
    "sectorId" INTEGER,
    "coBorrowerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_incomes" (
    "id" SERIAL NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "monthYear" TEXT NOT NULL,
    "saleRevenue" DECIMAL(15,2) NOT NULL,
    "costOfSale" DECIMAL(15,2) NOT NULL,
    "grossProfit" DECIMAL(15,2) NOT NULL,
    "operExpense" DECIMAL(15,2) NOT NULL,
    "netProfit" DECIMAL(15,2) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."districts" (
    "id" SERIAL NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."external_loans" (
    "id" SERIAL NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "source" TEXT,
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loan_applications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "borrowerId" INTEGER NOT NULL,
    "loanType" "public"."LoanType" NOT NULL DEFAULT 'PERSONAL_SALARY_GUARANTEE',
    "customerType" "public"."CustomerType" NOT NULL DEFAULT 'NEW',
    "loanPurpose" TEXT NOT NULL,
    "loanAmountRequested" DECIMAL(15,2) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "interestRatePa" DECIMAL(5,2) NOT NULL,
    "repaymentMode" TEXT NOT NULL DEFAULT 'Flat rate',
    "processingFeesPercent" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "processingFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "collateralFeesPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "collateralFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "earlySettleFeesPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "otherFeesPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "otherFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "creditHistoryGrade" "public"."CreditGrade" NOT NULL DEFAULT 'A',
    "existingDebt" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "evidenceOfIncome" TEXT,
    "evidenceOfIncomeType" "public"."IncomeEvidenceType" NOT NULL DEFAULT 'BANK_STATEMENT',
    "status" "public"."LoanStatus" NOT NULL DEFAULT 'PENDING_VERIFIER',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentLinks" TEXT,

    CONSTRAINT "loan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" DECIMAL(15,2) NOT NULL,
    "principalPaid" DECIMAL(15,2) NOT NULL,
    "interestPaid" DECIMAL(15,2) NOT NULL,
    "isOnTime" BOOLEAN NOT NULL DEFAULT true,
    "receiptNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."provinces" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sectors" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "sector" TEXT NOT NULL,
    "subSector" TEXT,
    "smfV1" DECIMAL(5,1),
    "smfV2" DECIMAL(5,1),
    "smfV3" DECIMAL(5,1),
    "bolEconomic" TEXT,
    "bolCode" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT,
    "signatureUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalHistory_approverId_idx" ON "public"."ApprovalHistory"("approverId" ASC);

-- CreateIndex
CREATE INDEX "ApprovalHistory_assessmentId_idx" ON "public"."ApprovalHistory"("assessmentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "assessments_applicationId_key" ON "public"."assessments"("applicationId" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "public"."audit_logs"("entityType" ASC, "entityId" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_performedAt_idx" ON "public"."audit_logs"("performedAt" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId" ASC);

-- CreateIndex
CREATE INDEX "borrowers_phone_idx" ON "public"."borrowers"("phone" ASC);

-- CreateIndex
CREATE INDEX "districts_provinceId_idx" ON "public"."districts"("provinceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "districts_provinceId_name_key" ON "public"."districts"("provinceId" ASC, "name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "public"."provinces"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_name_key" ON "public"."provinces"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username" ASC);

-- AddForeignKey
ALTER TABLE "public"."ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_ceoId_fkey" FOREIGN KEY ("ceoId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_dcoId_fkey" FOREIGN KEY ("dcoId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."borrower_incomes" ADD CONSTRAINT "borrower_incomes_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "public"."borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."borrowers" ADD CONSTRAINT "borrowers_businessDistrictId_fkey" FOREIGN KEY ("businessDistrictId") REFERENCES "public"."districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."borrowers" ADD CONSTRAINT "borrowers_businessProvinceId_fkey" FOREIGN KEY ("businessProvinceId") REFERENCES "public"."provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."borrowers" ADD CONSTRAINT "borrowers_coBorrowerId_fkey" FOREIGN KEY ("coBorrowerId") REFERENCES "public"."borrowers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."borrowers" ADD CONSTRAINT "borrowers_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "public"."districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."borrowers" ADD CONSTRAINT "borrowers_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "public"."provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."borrowers" ADD CONSTRAINT "borrowers_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "public"."sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_incomes" ADD CONSTRAINT "business_incomes_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "public"."borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."districts" ADD CONSTRAINT "districts_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "public"."provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."external_loans" ADD CONSTRAINT "external_loans_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "public"."borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loan_applications" ADD CONSTRAINT "loan_applications_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "public"."borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loan_applications" ADD CONSTRAINT "loan_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

