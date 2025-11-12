#1e3a8a",
                              border: "1px solid #3b82f6",
                              color: "#fff",
                            }}
                            formatter={(value) => [
                              `${value} cirurgias`,
                              "Quantidade",
                            ]}
                          />
                          <Bar
                            dataKey="value"
                            fill="#3b82f6"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="w-16 h-16 mb-4 text-muted-foreground/50" />
                          <p className="text-center">
                            Não há dados suficientes para exibir este gráfico.
                            <br />
                            Crie mais solicitações de cirurgias para ver
                            estatísticas.
                          </p>
                        </div>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                  {topProcedures.length > 0 &&
                    (() => {
                      const totalProcedures = topProcedures.reduce(
                        (sum, proc) => sum + proc.count,
                        0,
                      );
                      const totalOrders = summaryStats.orderCount || 0;
                      const withoutProcedures = Math.max(
                        0,
                        totalOrders - totalProcedures,
                      );
                      return totalProcedures > 0 ? (
                        <CardFooter className="pt-4 border-t">
                          <div className="w-full">
                            <p className="text-sm font-medium text-card-foreground mb-2">
                              Resumo detalhado:
                            </p>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between p-2 bg-primary/10 rounded font-medium">
                                <span>Com procedimentos:</span>
                                <span>{totalProcedures} cirurgias</span>
                              </div>
                              <div className="flex justify-between p-2 bg-muted rounded text-muted-foreground">
                                <span>Sem procedimentos:</span>
                                <span>{withoutProcedures} cirurgias</span>
                              </div>
                              <div className="flex justify-between p-2 bg-accent rounded font-medium">
                                <span>Total geral:</span>
                                <span>{totalOrders} cirurgias</span>
                              </div>
                            </div>
                          </div>
                        </CardFooter>
                      ) : null;
                    })()}
                </Card>

                <Card className="border-border bg-card shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-card-foreground">
                      Cirurgias por Convênio
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Distribuição por operadora de saúde
                      {insuranceDistribution.length > 0 &&
                        (() => {
                          const totalInsurance = insuranceDistribution.reduce(
                            (sum, ins) => sum + ins.value,
                            0,
                          );
                          return totalInsurance > 0
                            ? ` • ${totalInsurance} cirurgias com convênio definido`
                            : "";
                        })()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80 bg-card rounded-b-lg">
                    <ResponsiveContainer width="100%" height="100%">
                      {insuranceDistribution.length > 0 ? (
                        <BarChart
                          data={insuranceDistribution.map((ins) => ({
                            name: ins.name,
                            value: ins.value,
                          }))}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(59, 130, 246, 0.2)"
                          />
                          <XAxis type="number" stroke="#93c5fd" />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "#93c5fd" }}
                            width={120}
                            stroke="#93c5fd"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1e3a8a",
                              border: "1px solid #3b82f6",
                              color: "#fff",
                            }}
                            formatter={(value) => [
                              `${value} cirurgias`,
                              "Quantidade",
                            ]}
                          />
                          <Bar
                            dataKey="value"
                            fill="#3b82f6"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="w-16 h-16 mb-4 text-muted-foreground/50" />
                          <p className="text-center">
                            Não há dados suficientes para exibir este gráfico.
                            <br />
                            Crie mais solicitações de cirurgias para ver
                            estatísticas.
                          </p>
                        </div>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                  {insuranceDistribution.length > 0 &&
                    (() => {
                      const totalInsurance = insuranceDistribution.reduce(
                        (sum, ins) => sum + ins.value,
                        0,
                      );
                      return totalInsurance > 0 ? (
                        <CardFooter className="pt-4 border-t">
                          <div className="w-full">
                            <p className="text-sm font-medium text-card-foreground mb-2">
                              Resumo detalhado:
                            </p>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between p-2 bg-primary/10 rounded font-medium">
                                <span>Total de cirurgias:</span>
                                <span>{totalInsurance} cirurgias</span>
                              </div>
                              <div className="flex justify-between p-2 bg-accent rounded font-medium">
                                <span>Convênios cadastrados:</span>
                                <span>
                                  {insuranceDistribution.length} operadoras
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardFooter>
                      ) : null;
                    })()}
                </Card>
              </div>

              {/* Segunda linha - Cards adicionais de Distribuição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card className="border-border bg-card shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-card-foreground">
                      Cirurgias por Hospital
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Quantidade de cirurgias realizadas por hospital
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="bg-card rounded-b-lg">
                    <HospitalSurgeryList appliedFilters={appliedFilters} />
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-card-foreground">
                      Fornecedores por Cirurgias
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Fornecedores mais utilizados nos procedimentos OPME
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="bg-card rounded-b-lg">
                    <SupplierDistributionList appliedFilters={appliedFilters} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba de Valores Recebidos */}
            <TabsContent value="received-values" className="space-y-6">
              <ReceivedValuesTab appliedFilters={appliedFilters} />
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </div>
  );
}
