-- Criação da tabela de associação entre médicos e pacientes
CREATE TABLE IF NOT EXISTS doctor_patients (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    associated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(doctor_id, patient_id)
);

-- Índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_doctor_patients_doctor_id ON doctor_patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patients_patient_id ON doctor_patients(patient_id);