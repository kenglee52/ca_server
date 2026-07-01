-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_companyProvinceId_fkey" FOREIGN KEY ("companyProvinceId") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_companyDistrictId_fkey" FOREIGN KEY ("companyDistrictId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
