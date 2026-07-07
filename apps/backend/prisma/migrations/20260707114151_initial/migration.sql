-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "birthdate" VARCHAR(10) NOT NULL,
    "gender" INTEGER NOT NULL,
    "ethnicity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "creatine" DECIMAL(10,2) NOT NULL,
    "chloride" DECIMAL(10,2) NOT NULL,
    "fasting_glucose" DECIMAL(10,2) NOT NULL,
    "potassium" DECIMAL(10,2) NOT NULL,
    "sodium" DECIMAL(10,2) NOT NULL,
    "total_calcium" DECIMAL(10,2) NOT NULL,
    "total_protein" DECIMAL(10,2) NOT NULL,
    "creatine_unit" TEXT NOT NULL,
    "chloride_unit" TEXT NOT NULL,
    "fasting_glucose_unit" TEXT NOT NULL,
    "potassium_unit" TEXT NOT NULL,
    "sodium_unit" TEXT NOT NULL,
    "total_calcium_unit" TEXT NOT NULL,
    "total_protein_unit" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lab_results_patient_id_date_key" ON "lab_results"("patient_id", "date");

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
