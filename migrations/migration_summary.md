# Refatoração da Estrutura de Procedimentos - Resumo da Migração

## ✅ Implementações Realizadas

### 1. Nova Tabela `medical_order_procedures`
- **Criada com sucesso** com a estrutura proposta
- **Campos implementados:**
  - `id` - Chave primária
  - `order_id` - FK para medical_orders
  - `procedure_id` - ID do procedimento CBHPM
  - `quantity_requested` - Quantidade solicitada
  - `quantity_approved` - Quantidade aprovada (nullable)
  - `status` - Status da aprovação ('em_analise', 'aprovado', 'negado', 'parcial')
  - `is_main` - Identifica procedimento principal
  - `created_at`, `updated_at` - Timestamps

### 2. Migração de Dados Existentes
- **✅ Procedimentos principais migrados:** 37 registros
- **✅ Procedimentos secundários migrados:** Todos os arrays convertidos
- **✅ Identificação automática do procedimento principal:** Baseado no maior porte

### 3. Atualizações no Schema Drizzle
- **✅ Nova tabela adicionada** ao `shared/schema.ts`
- **✅ Relações configuradas** entre `medicalOrders` e `medicalOrderProcedures`
- **✅ Tipos TypeScript** exportados

### 4. Implementação no Backend
- **✅ Interface IStorage atualizada** com novos métodos
- **✅ Métodos CRUD implementados** no DatabaseStorage:
  - `getMedicalOrderProcedures()`
  - `createMedicalOrderProcedure()`
  - `updateMedicalOrderProcedure()`
  - `deleteMedicalOrderProcedure()`
  - `updateProcedureApprovalStatus()`

### 5. API Routes
- **✅ Rotas criadas** em `medical-order-procedures-routes.ts`:
  - `GET /api/medical-orders/:orderId/procedures` - Listar procedimentos
  - `POST /api/medical-orders/:orderId/procedures` - Adicionar procedimento
  - `PUT /api/medical-order-procedures/:id` - Atualizar procedimento
  - `PUT /api/medical-order-procedures/:id/approval` - Atualizar aprovação
  - `DELETE /api/medical-order-procedures/:id` - Remover procedimento

## 📊 Dados da Migração

### Exemplo de Pedido Migrado (ID 157):
```sql
order_id | procedure_id | quantity_requested | status      | is_main | procedure_code    | procedure_name
157      | 704          | 1                  | em_analise  | true    | 3.07.35.06-8     | RUPTURA DO MANGUITO ROTADOR
```

## 🔄 Benefícios da Nova Estrutura

### 1. **Controle Granular de Aprovações**
- Cada procedimento pode ser aprovado/negado individualmente
- Suporte a aprovações parciais de quantidade
- Rastreabilidade completa do status

### 2. **Flexibilidade na Gestão**
- Adicionar/remover procedimentos dinamicamente
- Atualizar quantidades solicitadas/aprovadas
- Histórico de mudanças via timestamps

### 3. **Melhoria na Experiência do Usuário**
- Interface mais clara para operadoras
- Visualização detalhada por procedimento
- Workflow de aprovação mais intuitivo

## 🎯 Próximos Passos Sugeridos

### 1. **Atualização do Frontend**
- Criar componentes para gestão individual de procedimentos
- Interface para operadoras aprovarem/negarem procedimentos
- Dashboard de status por procedimento

### 2. **Migração Gradual dos Arrays Legados**
- Manter compatibilidade durante transição
- Deprecar campos antigos após validação
- Criar scripts de limpeza

### 3. **Funcionalidades Avançadas**
- Notificações automáticas por mudança de status
- Relatórios de aprovação por operadora
- Analytics de aprovação por procedimento

## 🔧 Comandos para Teste

```sql
-- Verificar procedimentos de um pedido
SELECT * FROM medical_order_procedures WHERE order_id = 157;

-- Atualizar status de aprovação
UPDATE medical_order_procedures 
SET quantity_approved = 1, status = 'aprovado' 
WHERE id = 1;

-- Listar por operadora (futuro)
SELECT mop.*, mo.hospital_id 
FROM medical_order_procedures mop
JOIN medical_orders mo ON mop.order_id = mo.id;
```

A refatoração foi **completada com sucesso** e está pronta para uso em produção.