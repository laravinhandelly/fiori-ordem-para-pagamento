sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (
    Fragment,
    JSONModel,
    MessageBox,
    MessageToast
) {
    "use strict";

    return {
        onAbrirTempoProcesso: async function (oController) {
            try {
                var aContextosSelecionados = oController.extensionAPI.getSelectedContexts();

                if (!aContextosSelecionados || aContextosSelecionados.length === 0) {
                    MessageBox.warning("Selecione um pedido para acessar o controle de tempo.");
                    return;
                }

                if (aContextosSelecionados.length > 1) {
                    MessageBox.warning("Selecione somente um pedido para atualizar o controle de tempo.");
                    return;
                }

                var oContextoSelecionado = aContextosSelecionados[0];
                var oPedidoSelecionado = oContextoSelecionado.getObject();

                oController._oPedidoTempoSelecionado = oPedidoSelecionado;

                var sPedidoVenda =
                    oPedidoSelecionado.PedidoVenda ||
                    oPedidoSelecionado.NumeroPedido ||
                    oPedidoSelecionado.Vbeln ||
                    oPedidoSelecionado.VBELN;

                if (!sPedidoVenda) {
                    MessageBox.error("Não foi possível identificar o número do pedido selecionado.");
                    return;
                }

                sPedidoVenda = String(sPedidoVenda).padStart(10, "0");

                await this._carregarDialogTempoProcesso(oController);

                this._inicializarModeloTempoProcesso(
                    oController,
                    sPedidoVenda,
                    oPedidoSelecionado
                );

                this._buscarTempoAtual(oController, sPedidoVenda);

            } catch (oErro) {
                MessageBox.error(
                    "Não foi possível abrir o controle de tempo.\n\n" +
                    this._obterMensagemErroTempo(oErro)
                );
            }
        },

        _carregarDialogTempoProcesso: async function (oController) {
            if (!oController._oDialogTempoProcesso) {
                oController._oDialogTempoProcesso = await Fragment.load({
                    id: oController.getView().getId(),
                    name: "com.mooviordem.zui5.ordem.to.cash.ext.fragment.TempoProcesso",
                    controller: oController
                });

                oController.getView().addDependent(oController._oDialogTempoProcesso);
            }

            oController._oDialogTempoProcesso.open();
        },

        _inicializarModeloTempoProcesso: function (oController, sPedidoVenda, oPedidoSelecionado) {
            var oAgora = new Date();

            var oDataCriacao = this._converterDataODataTempo(
                oPedidoSelecionado.DataCriacao ||
                oPedidoSelecionado.dataCriacao ||
                oPedidoSelecionado.Erdat ||
                oPedidoSelecionado.ERDAT
            );

            var sHoraCriacao = this._normalizarHoraODataTempo(
                oPedidoSelecionado.HoraCriacao ||
                oPedidoSelecionado.horaCriacao ||
                oPedidoSelecionado.Erzet ||
                oPedidoSelecionado.ERZET
            );

            var oModeloTempo = new JSONModel({
                PedidoVenda: sPedidoVenda,
                Sequencia: "Novo registro",

                DataCriacao: oDataCriacao,
                HoraCriacao: sHoraCriacao,
                CriadoPor:
                    oPedidoSelecionado.CriadoPor ||
                    oPedidoSelecionado.criadoPor ||
                    oPedidoSelecionado.Ernam ||
                    oPedidoSelecionado.ERNAM ||
                    "-",

                DataCriacaoExibicao: this._formatarDataExibicaoTempo(oDataCriacao),
                HoraCriacaoExibicao: this._formatarHoraTextoTempo(sHoraCriacao),

                DataModificacao: null,
                HoraModificacao: null,
                ModificadoPor: "",

                DataModificacaoInput: this._formatarDataInputTempo(oAgora),
                HoraModificacaoInput: this._formatarHoraInputTempo(oAgora),

                DataModificacaoExibicao: this._formatarDataExibicaoTempo(oAgora),
                HoraModificacaoExibicao: this._formatarHoraExibicaoTempo(oAgora),

                DuracaoSegundos: 0,
                DuracaoExtenso: "Aguardando cálculo",
                DuracaoCalculadaPreview: "Aguardando cálculo",

                RegistradoEm: null,
                RegistradoEmExibicao: "Nenhum registro anterior",

                StatusRegistro: "Novo registro",
                EstadoRegistro: "Information",
                IconeRegistro: "sap-icon://add",

                EstadoDuracao: "None",
                ValueStateDuracao: "None",
                MensagemDuracao: "",

                PodeSalvar: false,
                Carregando: true
            });

            oController.getView().setModel(oModeloTempo, "tempoProcesso");
        },

        _buscarTempoAtual: function (oController, sPedidoVenda) {
            var oODataModel = oController.getView().getModel();
            var oModeloTempo = oController.getView().getModel("tempoProcesso");

            var sPedidoEscapado = String(sPedidoVenda).replace(/'/g, "''");

            oODataModel.read("/TempoAtual", {
                urlParameters: {
                    "\$filter": "PedidoVenda eq '" + sPedidoEscapado + "'",
                    "\$top": "1"
                },
                success: function (oData) {
                    var aResultados = oData && Array.isArray(oData.results) ? oData.results : [];

                    if (aResultados.length > 0) {
                        this._preencherTempoAtual(oController, aResultados[0]);
                    } else {
                        this._buscarDadosPedidoTempo(oController, sPedidoVenda);
                    }

                    oModeloTempo.setProperty("/Carregando", false);
                }.bind(this),
                error: function (oErro) {
                    oModeloTempo.setProperty("/Carregando", false);
                    MessageBox.error(
                        "Não foi possível consultar o controle de tempo.\n\n" +
                        this._obterMensagemErroTempo(oErro)
                    );
                }.bind(this)
            });
        },

        _buscarDadosPedidoTempo: function (oController, sPedidoVenda) {
            var oODataModel = oController.getView().getModel();
            var oModeloTempo = oController.getView().getModel("tempoProcesso");

            var sPedidoEscapado = String(sPedidoVenda).replace(/'/g, "''");

            oODataModel.read("/TempoPedido", {
                urlParameters: {
                    "\$filter": "PedidoVenda eq '" + sPedidoEscapado + "'",
                    "\$top": "1"
                },
                success: function (oData) {
                    var aResultados = oData && Array.isArray(oData.results) ? oData.results : [];

                    if (aResultados.length === 0) {
                        oModeloTempo.setProperty("/Carregando", false);
                        oModeloTempo.setProperty("/PodeSalvar", false);
                        MessageBox.error("Não foram encontrados os dados de criação do pedido " + sPedidoVenda + ".");
                        return;
                    }

                    this._preencherPrimeiroRegistroTempo(oController, aResultados[0]);
                }.bind(this),
                error: function (oErro) {
                    oModeloTempo.setProperty("/Carregando", false);
                    oModeloTempo.setProperty("/PodeSalvar", false);
                    MessageBox.error(
                        "Não foi possível consultar os dados do pedido.\n\n" +
                        this._obterMensagemErroTempo(oErro)
                    );
                }.bind(this)
            });
        },

        _recarregarTempoAposSalvar: function (oController, sPedidoVenda) {
            var oODataModel = oController.getView().getModel();
            var oModeloTempo = oController.getView().getModel("tempoProcesso");

            var sPedidoEscapado = String(sPedidoVenda).replace(/'/g, "''");

            oODataModel.read("/TempoAtual", {
                urlParameters: {
                    "\$filter": "PedidoVenda eq '" + sPedidoEscapado + "'",
                    "\$top": "1",
                    "_ts": String(Date.now())
                },
                success: function (oData) {
                    if (oController._oDialogTempoProcesso) {
                        oController._oDialogTempoProcesso.setBusy(false);
                    }

                    var aResultados = oData && Array.isArray(oData.results) ? oData.results : [];

                    if (aResultados.length === 0) {
                        oModeloTempo.setProperty("/PodeSalvar", true);
                        MessageBox.warning("O registro foi salvo, mas não foi possível consultar o novo histórico.");
                        return;
                    }

                    this._preencherTempoAtual(oController, aResultados[0]);
                    MessageToast.show("Controle de tempo registrado com sucesso.");
                }.bind(this),
                error: function (oErro) {
                    if (oController._oDialogTempoProcesso) {
                        oController._oDialogTempoProcesso.setBusy(false);
                    }

                    oModeloTempo.setProperty("/PodeSalvar", true);
                    MessageBox.warning(
                        "O registro foi salvo no banco, mas não foi possível atualizar o popup.\n\n" +
                        this._obterMensagemErroTempo(oErro)
                    );
                }.bind(this)
            });
        },

        _preencherPrimeiroRegistroTempo: function (oController, oPedido) {
            var oModeloTempo = oController.getView().getModel("tempoProcesso");

            var oDataCriacao = this._converterDataODataTempo(
                oPedido.DataCriacao || oPedido.dataCriacao || oPedido.Erdat || oPedido.ERDAT
            );

            var sHoraCriacao = this._normalizarHoraODataTempo(
                oPedido.HoraCriacao || oPedido.horaCriacao || oPedido.Erzet || oPedido.ERZET
            );

            oModeloTempo.setProperty("/PedidoVenda", oPedido.PedidoVenda || oPedido.pedidoVenda);
            oModeloTempo.setProperty("/Sequencia", "Primeiro registro");
            oModeloTempo.setProperty("/DataCriacao", oDataCriacao);
            oModeloTempo.setProperty("/HoraCriacao", sHoraCriacao);
            oModeloTempo.setProperty("/CriadoPor", oPedido.CriadoPor || oPedido.criadoPor || "-");
            oModeloTempo.setProperty("/DataCriacaoExibicao", this._formatarDataExibicaoTempo(oDataCriacao));
            oModeloTempo.setProperty("/HoraCriacaoExibicao", this._formatarHoraTextoTempo(sHoraCriacao));
            oModeloTempo.setProperty("/DataModificacao", null);
            oModeloTempo.setProperty("/HoraModificacao", null);
            oModeloTempo.setProperty("/ModificadoPor", "-");
            oModeloTempo.setProperty("/DataModificacaoExibicao", "-");
            oModeloTempo.setProperty("/HoraModificacaoExibicao", "-");
            oModeloTempo.setProperty("/DuracaoSegundos", 0);
            oModeloTempo.setProperty("/DuracaoExtenso", "Aguardando cálculo");
            oModeloTempo.setProperty("/RegistradoEm", null);
            oModeloTempo.setProperty("/RegistradoEmExibicao", "Nenhum registro anterior");
            oModeloTempo.setProperty("/StatusRegistro", "Sem histórico");
            oModeloTempo.setProperty("/EstadoRegistro", "Information");
            oModeloTempo.setProperty("/IconeRegistro", "sap-icon://add");
            oModeloTempo.setProperty("/Carregando", false);

            this.onAlterarDataHoraTempo(oController);
        },

        _preencherTempoAtual: function (oController, oRegistro) {
            var oModeloTempo = oController.getView().getModel("tempoProcesso");
            var oAgora = new Date();

            var oDataCriacao = this._converterDataODataTempo(
                oRegistro.DataCriacao || oRegistro.dataCriacao
            );

            var sHoraCriacao = this._normalizarHoraODataTempo(
                oRegistro.HoraCriacao || oRegistro.horaCriacao
            );

            var oDataModificacaoAnterior = this._converterDataODataTempo(
                oRegistro.DataModificacao || oRegistro.dataModificacao || oRegistro.Erdat || oRegistro.ERDAT
            );

            var sHoraModificacaoAnterior = this._normalizarHoraODataTempo(
                oRegistro.HoraModificacao || oRegistro.horaModificacao || oRegistro.Erzet || oRegistro.ERZET
            );

            oModeloTempo.setProperty("/PedidoVenda", oRegistro.PedidoVenda || oRegistro.pedidoVenda);
            oModeloTempo.setProperty("/Sequencia", oRegistro.Sequencia || "-");
            oModeloTempo.setProperty("/DataCriacao", oDataCriacao);
            oModeloTempo.setProperty("/HoraCriacao", sHoraCriacao);
            oModeloTempo.setProperty("/CriadoPor", oRegistro.CriadoPor || "-");
            oModeloTempo.setProperty("/DataCriacaoExibicao", this._formatarDataExibicaoTempo(oDataCriacao));
            oModeloTempo.setProperty("/HoraCriacaoExibicao", this._formatarHoraTextoTempo(sHoraCriacao));
            oModeloTempo.setProperty("/DataModificacao", oDataModificacaoAnterior);
            oModeloTempo.setProperty("/HoraModificacao", sHoraModificacaoAnterior);
            oModeloTempo.setProperty("/ModificadoPor", oRegistro.ModificadoPor || "-");
            oModeloTempo.setProperty("/DataModificacaoExibicao", this._formatarDataExibicaoTempo(oDataModificacaoAnterior));
            oModeloTempo.setProperty("/HoraModificacaoExibicao", this._formatarHoraTextoTempo(sHoraModificacaoAnterior));
            oModeloTempo.setProperty("/DataModificacaoInput", this._formatarDataInputTempo(oAgora));
            oModeloTempo.setProperty("/HoraModificacaoInput", this._formatarHoraInputTempo(oAgora));
            oModeloTempo.setProperty("/DuracaoSegundos", Number(oRegistro.DuracaoSegundos || 0));
            oModeloTempo.setProperty("/DuracaoExtenso", oRegistro.DuracaoExtenso || "-");
            oModeloTempo.setProperty("/RegistradoEm", oRegistro.RegistradoEm);
            oModeloTempo.setProperty("/RegistradoEmExibicao", this._formatarTimestampExibicaoTempo(oRegistro.RegistradoEm));
            oModeloTempo.setProperty("/StatusRegistro", "Histórico encontrado");
            oModeloTempo.setProperty("/EstadoRegistro", "Success");
            oModeloTempo.setProperty("/IconeRegistro", "sap-icon://history");
            oModeloTempo.setProperty("/Carregando", false);

            this.onAlterarDataHoraTempo(oController);
        },

        onAlterarDataHoraTempo: function (oController) {
            var oModeloTempo = oController.getView().getModel("tempoProcesso");
            if (!oModeloTempo) {
                return;
            }

            var oDataCriacao = oModeloTempo.getProperty("/DataCriacao");
            var sHoraCriacao = oModeloTempo.getProperty("/HoraCriacao");
            var sDataModificacao = oModeloTempo.getProperty("/DataModificacaoInput");
            var sHoraModificacao = oModeloTempo.getProperty("/HoraModificacaoInput");

            if (!sDataModificacao || !sHoraModificacao) {
                oModeloTempo.setProperty("/DuracaoCalculadaPreview", "Preencha a data e a hora de modificação.");
                oModeloTempo.setProperty("/ValueStateDuracao", "Warning");
                oModeloTempo.setProperty("/MensagemDuracao", "A data e a hora de modificação são obrigatórias.");
                oModeloTempo.setProperty("/EstadoDuracao", "Warning");
                oModeloTempo.setProperty("/PodeSalvar", false);
                return;
            }

            if (!oDataCriacao || !sHoraCriacao) {
                oModeloTempo.setProperty("/DuracaoCalculadaPreview", "A duração será calculada pelo sistema ao salvar.");
                oModeloTempo.setProperty("/DuracaoExtenso", "Aguardando salvamento");
                oModeloTempo.setProperty("/ValueStateDuracao", "Information");
                oModeloTempo.setProperty("/MensagemDuracao", "Os dados de criação serão consultados na VBAK.");
                oModeloTempo.setProperty("/EstadoDuracao", "Information");
                oModeloTempo.setProperty("/PodeSalvar", true);
                return;
            }

            var oInicio = this._montarDataHoraTempo(oDataCriacao, sHoraCriacao);
            var oFim = this._montarDataHoraTempo(sDataModificacao, sHoraModificacao);

            if (!oInicio || !oFim) {
                oModeloTempo.setProperty("/DuracaoCalculadaPreview", "Data ou hora inválida.");
                oModeloTempo.setProperty("/ValueStateDuracao", "Error");
                oModeloTempo.setProperty("/MensagemDuracao", "Verifique a data e a hora informadas.");
                oModeloTempo.setProperty("/EstadoDuracao", "Error");
                oModeloTempo.setProperty("/PodeSalvar", false);
                return;
            }

            var iDiferencaMilissegundos = oFim.getTime() - oInicio.getTime();

            if (iDiferencaMilissegundos < 0) {
                oModeloTempo.setProperty("/DuracaoCalculadaPreview", "A modificação não pode ser anterior à criação.");
                oModeloTempo.setProperty("/ValueStateDuracao", "Error");
                oModeloTempo.setProperty("/MensagemDuracao", "Informe uma data e uma hora posteriores à criação do pedido.");
                oModeloTempo.setProperty("/EstadoDuracao", "Error");
                oModeloTempo.setProperty("/PodeSalvar", false);
                return;
            }

            var iTotalSegundos = Math.floor(iDiferencaMilissegundos / 1000);
            var sDuracao = this._formatarDuracaoTempo(iTotalSegundos);

            oModeloTempo.setProperty("/DuracaoSegundos", iTotalSegundos);
            oModeloTempo.setProperty("/DuracaoCalculadaPreview", sDuracao);
            oModeloTempo.setProperty("/DuracaoExtenso", sDuracao);
            oModeloTempo.setProperty("/ValueStateDuracao", "Success");
            oModeloTempo.setProperty("/MensagemDuracao", "Duração calculada com sucesso.");
            oModeloTempo.setProperty("/EstadoDuracao", "Success");
            oModeloTempo.setProperty("/PodeSalvar", true);
        },

        onSalvarTempoProcesso: function (oController) {
            var oODataModel = oController.getView().getModel();
            var oModeloTempo = oController.getView().getModel("tempoProcesso");

            if (!oModeloTempo) {
                return;
            }

            var sPedidoVenda = oModeloTempo.getProperty("/PedidoVenda");
            var sDataModificacao = oModeloTempo.getProperty("/DataModificacaoInput");
            var sHoraModificacao = oModeloTempo.getProperty("/HoraModificacaoInput");
            var bPodeSalvar = oModeloTempo.getProperty("/PodeSalvar");

            if (!sPedidoVenda || !sDataModificacao || !sHoraModificacao || !bPodeSalvar) {
                MessageBox.warning("Verifique a data e a hora de modificação antes de salvar.");
                return;
            }

            var oDataModificacao = this._montarDataHoraTempo(sDataModificacao, "00:00:00");

            if (!oDataModificacao) {
                MessageBox.error("A data de modificação informada é inválida.");
                return;
            }

            var oPayload = {
                PedidoVenda: String(sPedidoVenda).padStart(10, "0"),
                DataModificacao: oDataModificacao,
                HoraModificacao: this._converterHoraParaDuracaoODataTempo(sHoraModificacao)
            };

            oModeloTempo.setProperty("/PodeSalvar", false);

            if (oController._oDialogTempoProcesso) {
                oController._oDialogTempoProcesso.setBusy(true);
            }

            oODataModel.create("/TempoHistorico", oPayload, {
                success: function () {
                    oODataModel.refresh(true);
                    this._recarregarTempoAposSalvar(oController, sPedidoVenda);

                    if (oController.extensionAPI && oController.extensionAPI.refreshTable) {
                        oController.extensionAPI.refreshTable();
                    }
                }.bind(this),
                error: function (oErro) {
                    if (oController._oDialogTempoProcesso) {
                        oController._oDialogTempoProcesso.setBusy(false);
                    }

                    oModeloTempo.setProperty("/PodeSalvar", true);
                    MessageBox.error(
                        "Não foi possível salvar o controle de tempo.\n\n" +
                        this._obterMensagemErroTempo(oErro)
                    );
                }.bind(this)
            });
        },

        onFecharTempoProcesso: function (oController) {
            if (oController._oDialogTempoProcesso) {
                oController._oDialogTempoProcesso.close();
            }
        },

        onDepoisFecharTempoProcesso: function (oController) {
            var oModeloTempo = oController.getView().getModel("tempoProcesso");
            if (oModeloTempo) {
                oModeloTempo.setData({});
            }
            oController._oPedidoTempoSelecionado = null;
        },

        _montarDataHoraTempo: function (vData, sHora) {
            var oData, iAno, iMes, iDia, aData;

            if (vData instanceof Date) {
                if (isNaN(vData.getTime())) {
                    return null;
                }
                oData = new Date(vData.getFullYear(), vData.getMonth(), vData.getDate(), 0, 0, 0, 0);
            } else if (typeof vData === "string") {
                vData = vData.trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(vData)) {
                    aData = vData.split("-");
                    iAno = Number(aData[0]);
                    iMes = Number(aData[1]);
                    iDia = Number(aData[2]);
                } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(vData)) {
                    aData = vData.split("/");
                    iDia = Number(aData[0]);
                    iMes = Number(aData[1]);
                    iAno = Number(aData[2]);
                } else {
                    return null;
                }

                oData = new Date(iAno, iMes - 1, iDia, 0, 0, 0, 0);
                if (oData.getFullYear() !== iAno || oData.getMonth() !== iMes - 1 || oData.getDate() !== iDia) {
                    return null;
                }
            } else {
                return null;
            }

            var sHoraNormalizada = this._normalizarHoraODataTempo(sHora);
            if (!sHoraNormalizada) {
                return null;
            }

            var aHora = sHoraNormalizada.split(":");
            var iHora = Number(aHora[0]);
            var iMinuto = Number(aHora[1]);
            var iSegundo = Number(aHora[2]);

            if (!Number.isInteger(iHora) || !Number.isInteger(iMinuto) || !Number.isInteger(iSegundo) ||
                iHora < 0 || iHora > 23 || iMinuto < 0 || iMinuto > 59 || iSegundo < 0 || iSegundo > 59) {
                return null;
            }

            oData.setHours(iHora, iMinuto, iSegundo, 0);
            return isNaN(oData.getTime()) ? null : oData;
        },

        _formatarDuracaoTempo: function (iTotalSegundos) {
            var iSegundos = Number(iTotalSegundos);
            if (!Number.isFinite(iSegundos) || iSegundos < 0) {
                return "";
            }

            iSegundos = Math.floor(iSegundos);
            var iDias = Math.floor(iSegundos / 86400);
            var iResto = iSegundos % 86400;
            var iHoras = Math.floor(iResto / 3600);
            iResto = iResto % 3600;
            var iMinutos = Math.floor(iResto / 60);

            return iDias + " dia(s), " + iHoras + "h " + iMinutos + "min";
        },

        _converterDataODataTempo: function (vData) {
            if (vData === null || vData === undefined || vData === "") {
                return null;
            }

            if (vData instanceof Date) {
                if (isNaN(vData.getTime())) {
                    return null;
                }
                return new Date(vData.getFullYear(), vData.getMonth(), vData.getDate(), 0, 0, 0, 0);
            }

            if (typeof vData !== "string") {
                return null;
            }

            var sData = vData.trim();
            var oResultadoOData = /^\/Date\((-?\d+)(?:[+-]\d+)?\)\/$/.exec(sData);

            if (oResultadoOData) {
                var oDataUTC = new Date(Number(oResultadoOData[1]));
                if (isNaN(oDataUTC.getTime())) {
                    return null;
                }
                return new Date(oDataUTC.getUTCFullYear(), oDataUTC.getUTCMonth(), oDataUTC.getUTCDate(), 0, 0, 0, 0);
            }

            var iAno, iMes, iDia, aPartes;
            if (/^\d{4}-\d{2}-\d{2}$/.test(sData)) {
                aPartes = sData.split("-");
                iAno = Number(aPartes[0]);
                iMes = Number(aPartes[1]);
                iDia = Number(aPartes[2]);
            } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sData)) {
                aPartes = sData.split("/");
                iDia = Number(aPartes[0]);
                iMes = Number(aPartes[1]);
                iAno = Number(aPartes[2]);
            } else {
                return null;
            }

            var oData = new Date(iAno, iMes - 1, iDia, 0, 0, 0, 0);
            if (oData.getFullYear() !== iAno || oData.getMonth() !== iMes - 1 || oData.getDate() !== iDia) {
                return null;
            }

            return oData;
        },

        _normalizarHoraODataTempo: function (vHora) {
            if (vHora === null || vHora === undefined || vHora === "") {
                return null;
            }

            if (typeof vHora === "object" && vHora.ms !== undefined) {
                var iMilissegundos = Number(vHora.ms);
                if (!Number.isFinite(iMilissegundos) || iMilissegundos < 0 || iMilissegundos >= 86400000) {
                    return null;
                }
                var iTotalSegundos = Math.floor(iMilissegundos / 1000);
                var iHoras = Math.floor(iTotalSegundos / 3600);
                var iMinutos = Math.floor((iTotalSegundos % 3600) / 60);
                var iSegundos = iTotalSegundos % 60;
                return String(iHoras).padStart(2, "0") + ":" + String(iMinutos).padStart(2, "0") + ":" + String(iSegundos).padStart(2, "0");
            }

            var sHora = String(vHora).trim();
            if (/^\d{6}$/.test(sHora)) {
                sHora = sHora.substring(0, 2) + ":" + sHora.substring(2, 4) + ":" + sHora.substring(4, 6);
            } else if (/^\d{4}$/.test(sHora)) {
                sHora = sHora.substring(0, 2) + ":" + sHora.substring(2, 4) + ":00";
            } else {
                var oResultadoDuracao = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(sHora);
                if (oResultadoDuracao) {
                    var iHoraDuracao = Number(oResultadoDuracao[1] || 0);
                    var iMinutoDuracao = Number(oResultadoDuracao[2] || 0);
                    var iSegundoDuracao = Number(oResultadoDuracao[3] || 0);
                    if (iHoraDuracao > 23 || iMinutoDuracao > 59 || iSegundoDuracao > 59) {
                        return null;
                    }
                    return String(iHoraDuracao).padStart(2, "0") + ":" + String(iMinutoDuracao).padStart(2, "0") + ":" + String(iSegundoDuracao).padStart(2, "0");
                }
            }

            if (/^\d{1,2}:\d{2}$/.test(sHora)) {
                sHora += ":00";
            }

            var aHora = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(sHora);
            if (!aHora) {
                return null;
            }

            var iHoraFinal = Number(aHora[1]);
            var iMinutoFinal = Number(aHora[2]);
            var iSegundoFinal = Number(aHora[3]);

            if (iHoraFinal < 0 || iHoraFinal > 23 || iMinutoFinal < 0 || iMinutoFinal > 59 || iSegundoFinal < 0 || iSegundoFinal > 59) {
                return null;
            }

            return String(iHoraFinal).padStart(2, "0") + ":" + String(iMinutoFinal).padStart(2, "0") + ":" + String(iSegundoFinal).padStart(2, "0");
        },

        _formatarDataInputTempo: function (oData) {
            if (!(oData instanceof Date) || isNaN(oData.getTime())) {
                return "";
            }
            var iAno = oData.getFullYear();
            var sMes = String(oData.getMonth() + 1).padStart(2, "0");
            var sDia = String(oData.getDate()).padStart(2, "0");
            return iAno + "-" + sMes + "-" + sDia;
        },

        _formatarHoraInputTempo: function (oData) {
            if (!(oData instanceof Date) || isNaN(oData.getTime())) {
                return "";
            }
            var sHora = String(oData.getHours()).padStart(2, "0");
            var sMinuto = String(oData.getMinutes()).padStart(2, "0");
            return sHora + ":" + sMinuto;
        },

        _formatarDataExibicaoTempo: function (vData) {
            var oData = this._converterDataODataTempo(vData);
            if (!oData) {
                return "-";
            }
            return String(oData.getDate()).padStart(2, "0") + "/" + String(oData.getMonth() + 1).padStart(2, "0") + "/" + oData.getFullYear();
        },

        _formatarHoraExibicaoTempo: function (oData) {
            if (!(oData instanceof Date) || isNaN(oData.getTime())) {
                return "-";
            }
            return String(oData.getHours()).padStart(2, "0") + ":" + String(oData.getMinutes()).padStart(2, "0");
        },

        _formatarHoraTextoTempo: function (vHora) {
            var sHora = this._normalizarHoraODataTempo(vHora);
            if (!sHora) {
                return "-";
            }
            return sHora.substring(0, 5);
        },

        _formatarTimestampExibicaoTempo: function (vTimestamp) {
            if (!vTimestamp) {
                return "-";
            }
            var oDataHora = null;
            if (vTimestamp instanceof Date) {
                oDataHora = new Date(vTimestamp.getTime());
            } else if (typeof vTimestamp === "string") {
                var oResultadoOData = /\/Date\((-?\d+)(?:[+-]\d+)?\)\//.exec(vTimestamp);
                if (oResultadoOData) {
                    oDataHora = new Date(Number(oResultadoOData[1]));
                } else {
                    oDataHora = new Date(vTimestamp);
                }
            }

            if (!oDataHora || isNaN(oDataHora.getTime())) {
                return "-";
            }

            return String(oDataHora.getDate()).padStart(2, "0") + "/" + String(oDataHora.getMonth() + 1).padStart(2, "0") + "/" + oDataHora.getFullYear() + " às " + String(oDataHora.getHours()).padStart(2, "0") + ":" + String(oDataHora.getMinutes()).padStart(2, "0");
        },

        _converterHoraParaDuracaoODataTempo: function (sHora) {
            var sHoraNormalizada = this._normalizarHoraODataTempo(sHora);
            if (!sHoraNormalizada) {
                return null;
            }
            var aPartes = sHoraNormalizada.split(":");
            return "PT" + Number(aPartes[0] || 0) + "H" + Number(aPartes[1] || 0) + "M" + Number(aPartes[2] || 0) + "S";
        },

        _obterMensagemErroTempo: function (oErro) {
            if (!oErro) {
                return "Erro desconhecido.";
            }
            try {
                var sResposta = oErro.responseText || (oErro.response && oErro.response.body);
                if (sResposta) {
                    var oResposta = JSON.parse(sResposta);
                    if (oResposta.error && oResposta.error.message) {
                        return oResposta.error.message.value || oResposta.error.message;
                    }
                }
            } catch (oExcecao) {}
            return oErro.message || oErro.statusText || "Erro desconhecido.";
        }
    };
});