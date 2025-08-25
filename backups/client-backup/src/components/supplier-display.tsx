import { useState, useEffect } from "react";
import { getSupplierNamesByIds } from "@/lib/supplier-utils";

interface SupplierDisplayProps {
  supplierIds: number[];
  className?: string;
}

export function SupplierDisplay({ supplierIds, className = "" }: SupplierDisplayProps) {
  const [supplierNames, setSupplierNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSupplierNames = async () => {
      if (supplierIds.length === 0) {
        setSupplierNames([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const names = await getSupplierNamesByIds(supplierIds);
        setSupplierNames(names);
      } catch (error) {
        console.error("Erro ao carregar nomes dos fornecedores:", error);
        // Fallback para IDs se não conseguir carregar nomes
        setSupplierNames(supplierIds.map(id => `Fornecedor ID ${id}`));
      } finally {
        setLoading(false);
      }
    };

    loadSupplierNames();
  }, [supplierIds]);

  if (supplierIds.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <p className="font-bold text-xs text-gray-700">Fornecedores Indicados:</p>
      <div className="text-xs text-gray-900 pl-4">
        <p>
          {loading ? (
            "Carregando fornecedores..."
          ) : (
            supplierNames.map((name, index) => (
              <span key={index}>
                {name}
                {index < supplierNames.length - 1 && ' \u00A0\u00A0•\u00A0\u00A0 '}
              </span>
            ))
          )}
        </p>
      </div>
    </div>
  );
}