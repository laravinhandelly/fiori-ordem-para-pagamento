sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet"
], function (
    Fragment,
    JSONModel,
    MessageToast,
    MessageBox,
    Spreadsheet
) {
    "use strict";

    return {
        onVerificarATPCustom: function (oController) {
            var oExtensionAPI = oController.extensionAPI;
            var aContexts = oExtensionAPI.getSelectedContexts("responsiveTable");

            if (!aContexts || aContexts.length === 0) {
                MessageToast.show("Selecione pelo menos um pedido.");
                return;
            }

            oController.getView().setBusy(true);

            var aResultados = [];
            var aChamadas = aContexts.map(function (oContext) {
                return this._executarAcaoATP(oController, oContext)
                    .then(function (oResultado) {
                        aResultados.push(oResultado);
                    });
            }.bind(this));

            Promise.allSettled(aChamadas)
                .then(function () {
                    oController.getView().setBusy(false);

                    if (aResultados.length === 0) {
                        MessageBox.error("Não foi possível obter o resultado da verificação ATP.");
                        return;
                    }

                    this.onAbrirResultadoATP(oController, aResultados);

                    var oModel = oController.getView().getModel();
                    if (oModel) {
                        oModel.refresh(true);
                    }
                }.bind(this))
                .catch(function (oErro) {
                    oController.getView().setBusy(false);
                    MessageBox.error("Erro ao executar a verificação ATP.");
                    console.error(oErro);
                });
        },

        _executarAcaoATP: function (oController, oContext) {
            return new Promise(function (resolve) {
                var oModel = oController.getView().getModel();
                var sPedido = String(oContext.getProperty("PedidoVenda") || "").padStart(10, "0");

                oModel.callFunction(
                    "/VerificarATP",
                    {
                        method: "POST",
                        urlParameters: {
                            PedidoVenda: sPedido
                        },
                        success: function (oData, oResponse) {
                            resolve(
                                this._montarResultadoATP(sPedido, oData, oResponse)
                            );
                        }.bind(this),
                        error: function (oError) {
                            resolve({
                                pedido: sPedido,
                                status: "Erro",
                                mensagem: this._extrairMensagemErro(oError)
                            });
                        }.bind(this)
                    }
                );
            }.bind(this));
        },

        _montarResultadoATP: function (sPedido, oData, oResponse) {
            var sMensagemBackend = "";
            var sMensagemExibicao = "";
            var sStatus = "";

            if (oResponse && oResponse.headers && oResponse.headers["sap-message"]) {
                try {
                    var oSapMessage = JSON.parse(oResponse.headers["sap-message"]);
                    sMensagemBackend = oSapMessage.message || "";
                } catch (oErro) {
                    console.warn("Não foi possível interpretar o cabeçalho sap-message.", oErro);
                }
            }

            if (oData) {
                sStatus = oData.StatusATP || oData.status_atp || oData.statusATP || "";
                if (!sMensagemBackend) {
                    sMensagemBackend = oData.Mensagem || oData.mensagem || oData.Message || "";
                }
            }

            switch (sStatus) {
                case "Confirmado":
                    sMensagemExibicao = "Pedido liberado para entrega.";
                    break;
                case "Parcial":
                    sMensagemExibicao = "Quantidade parcialmente confirmada. Consulte os detalhes de disponibilidade.";
                    break;
                case "Não confirmado":
                    sMensagemExibicao = "Sem quantidade disponível para confirmação.";
                    break;
                case "Não verificado":
                    sMensagemExibicao = "A disponibilidade ATP ainda não foi verificada.";
                    break;
                case "Não aplicável":
                    sMensagemExibicao = "Não existem itens válidos para verificação ATP.";
                    break;
                case "Erro":
                    sMensagemExibicao = sMensagemBackend || "Não foi possível realizar a verificação ATP.";
                    break;
                default:
                    var sMensagemMinuscula = String(sMensagemBackend).toLowerCase();
                    if (sMensagemMinuscula.indexOf("detalhes de disponibilidade") !== -1) {
                        sStatus = "Parcial";
                        sMensagemExibicao = "Quantidade parcialmente confirmada. Consulte os detalhes de disponibilidade.";
                    } else if (sMensagemMinuscula.indexOf("liberado para entrega") !== -1) {
                        sStatus = "Confirmado";
                        sMensagemExibicao = "Pedido liberado para entrega.";
                    } else {
                        sStatus = "Não confirmado";
                        sMensagemExibicao = "Sem quantidade disponível para confirmação.";
                    }
                    break;
            }

            return {
                pedido: String(sPedido || "").padStart(10, "0"),
                status: sStatus,
                mensagem: sMensagemExibicao
            };
        },

        _extrairMensagemErro: function (oError) {
            try {
                var oResposta = JSON.parse(oError.responseText);
                return oResposta.error.message.value;
            } catch (oErro) {
                return "Erro ao executar a verificação ATP.";
            }
        },

        onAbrirResultadoATP: function (oController, aResultados) {
            var iConfirmados = 0;
            var iParciais = 0;
            var iNaoConfirmados = 0;

            aResultados.forEach(function (oResultado) {
                if (oResultado.status === "Confirmado") {
                    iConfirmados++;
                    oResultado.estado = "Success";
                } else if (oResultado.status === "Parcial") {
                    iParciais++;
                    oResultado.estado = "Warning";
                } else {
                    iNaoConfirmados++;
                    oResultado.estado = "Error";
                }
            });

            var iTotal = aResultados.length;
            var iPercentualConfirmados = iTotal > 0 ? Math.round((iConfirmados / iTotal) * 100) : 0;
            var iPercentualParciais = iTotal > 0 ? Math.round((iParciais / iTotal) * 100) : 0;
            var iPercentualNaoConfirmados = iTotal > 0 ? Math.round((iNaoConfirmados / iTotal) * 100) : 0;

            var sTextoResultadoGeral;
            var sEstadoResultadoGeral;

            if (iNaoConfirmados > 0) {
                sTextoResultadoGeral = iNaoConfirmados + " pedido(s) não confirmado(s)";
                sEstadoResultadoGeral = "Error";
            } else if (iParciais > 0) {
                sTextoResultadoGeral = iParciais + " pedido(s) parcialmente confirmado(s)";
                sEstadoResultadoGeral = "Warning";
            } else {
                sTextoResultadoGeral = "Todos os pedidos foram confirmados";
                sEstadoResultadoGeral = "Success";
            }

            var oModel = new JSONModel({
                resumo: {
                    total: iTotal,
                    confirmados: iConfirmados,
                    parciais: iParciais,
                    naoConfirmados: iNaoConfirmados,
                    percentualConfirmados: iPercentualConfirmados,
                    percentualParciais: iPercentualParciais,
                    percentualNaoConfirmados: iPercentualNaoConfirmados,
                    textoPercentualConfirmados: iPercentualConfirmados + "%",
                    textoPercentualParciais: iPercentualParciais + "%",
                    textoPercentualNaoConfirmados: iPercentualNaoConfirmados + "%",
                    textoResultadoGeral: sTextoResultadoGeral,
                    estadoResultadoGeral: sEstadoResultadoGeral
                },
                resultados: aResultados
            });

            oController.getView().setModel(oModel, "resultadoATP");

            if (!oController._oResultadoDialog) {
                Fragment.load({
                    id: oController.getView().getId(),
                    name: "com.mooviordem.zui5.ordem.to.cash.ext.fragment.ResultadoATP",
                    controller: oController
                }).then(function (oDialog) {
                    oController._oResultadoDialog = oDialog;
                    oController.getView().addDependent(oController._oResultadoDialog);
                    oController._oResultadoDialog.open();
                }.bind(oController));
                return;
            }

            oController._oResultadoDialog.open();
        },

        onExportarResultadoATP: function (oController) {
            var oResultadoModel = oController.getView().getModel("resultadoATP");

            if (!oResultadoModel) {
                MessageToast.show("Não existem resultados para exportação.");
                return;
            }

            var aResultados = oResultadoModel.getProperty("/resultados") || [];

            if (aResultados.length === 0) {
                MessageToast.show("Não existem resultados para exportação.");
                return;
            }

            var aColunas = [
                { label: "Pedido", property: "pedido", type: "String", width: 15 },
                { label: "Status ATP", property: "status", type: "String", width: 20 },
                { label: "Mensagem", property: "mensagem", type: "String", width: 65, wrap: true }
            ];

            var oConfiguracao = {
                workbook: {
                    columns: aColunas,
                    context: {
                        title: "Resultado da Verificação ATP",
                        sheetName: "Resultado ATP"
                    }
                },
                dataSource: aResultados,
                fileName: "Resultado_Verificacao_ATP_" + this._obterDataHoraArquivo() + ".xlsx",
                worker: false
            };

            var oPlanilha = new Spreadsheet(oConfiguracao);

            oPlanilha.build()
                .then(function () {
                    MessageToast.show("Arquivo Excel gerado com sucesso.");
                })
                .catch(function (oErro) {
                    MessageBox.error("Não foi possível gerar o arquivo Excel.");
                    console.error("Erro na exportação ATP:", oErro);
                })
                .finally(function () {
                    oPlanilha.destroy();
                });
        },

        _obterDataHoraArquivo: function () {
            var oData = new Date();
            var sAno = String(oData.getFullYear());
            var sMes = String(oData.getMonth() + 1).padStart(2, "0");
            var sDia = String(oData.getDate()).padStart(2, "0");
            var sHora = String(oData.getHours()).padStart(2, "0");
            var sMinuto = String(oData.getMinutes()).padStart(2, "0");
            return sAno + sMes + sDia + "_" + sHora + sMinuto;
        },

        onFecharResultadoATP: function (oController) {
            if (oController._oResultadoDialog) {
                oController._oResultadoDialog.close();
            }
        }
    };
});