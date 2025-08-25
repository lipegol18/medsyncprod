import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Patient } from "@shared/schema";
import { User } from "lucide-react";
import { PatientSearch } from "@/components/patients/patient-search";

interface PatientSelectionProps {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  onPatientSelected?: (patient: Patient) => void;
}

export function PatientSelection({ 
  selectedPatient, 
  setSelectedPatient,
  onPatientSelected
}: PatientSelectionProps) {
  
  // Função para tratar seleção de paciente
  const handlePatientSelected = (patient: Patient) => {
    // Não chamamos setSelectedPatient aqui pois o PatientSearch já faz isso
    // Apenas chamar callback se existir
    if (onPatientSelected) {
      onPatientSelected(patient);
    }
  };

  return (
    <div className="mb-6 text-white">
      <div className="flex items-center mb-4">
        <User className="mr-2 h-5 w-5 text-blue-400" />
        <div>
          <h3 className="text-lg font-medium text-white">Dados do Paciente</h3>
          <p className="text-sm text-blue-200">
            Informe o nome ou CPF do paciente para o pedido cirúrgico
          </p>
        </div>
      </div>
      <div className="bg-[#1a2332]/70 border border-blue-800 p-5 rounded-md shadow-md">
        <div className="space-y-4">
          <PatientSearch 
            selectedPatient={selectedPatient}
            setSelectedPatient={setSelectedPatient}
            onPatientSelected={handlePatientSelected}
          />
        </div>
      </div>
    </div>
  );
}