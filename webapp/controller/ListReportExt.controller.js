sap.ui.define([
    "com/mooviordem/zui5/ordem/to/cash/utils/ATPHandler",
    "com/mooviordem/zui5/ordem/to/cash/utils/TimeHandler",
    "com/mooviordem/zui5/ordem/to/cash/utils/PrintHandler",
    "com/mooviordem/zui5/ordem/to/cash/utils/UIHelper"
], function (
    ATPHandler,
    TimeHandler,
    PrintHandler,
    UIHelper
) {
    "use strict";

    sap.ui.controller(
        "com.mooviordem.zui5.ordem.to.cash.controller.ListReportExt",
        {
            onInit: function () {
                console.log("ListReportExt carregado com sucesso");

                // Aguarda o SmartFilterBar ser inicializado para ativar o modo reativo automático
                this.byId("listReportFilter").attachInitialized(function (oEvent) {
                    var oSmartFilterBar = oEvent.getSource();
                    
                    // Habilita o modo live para disparar a busca automaticamente ao alterar ou limpar filtros
                    oSmartFilterBar.setLiveMode(true);
                });
                // Substitui o texto "Standard" ou "Padrão" pela imagem da logo
                var oView = this.getView();
                oView.addEventDelegate({
                    onAfterRendering: function () {
                        var aVariantLinks = document.querySelectorAll(".sapMText, .sapMTitle");
                        for (var i = 0; i < aVariantLinks.length; i++) {
                            // Adicionada a verificação para "Padrão"
                            var sText = aVariantLinks[i].innerText.trim();
                            if (sText === "Standard" || sText === "Padrão" || sText === "AGGIRE") {
                                var oParent = aVariantLinks[i];
                                
                                if (!oParent.querySelector("img")) {
                                    oParent.innerHTML = ""; // Limpa o conteúdo anterior
                                    
                                    var sAppPath = sap.ui.require.toUrl("com/mooviordem/zui5/ordem/to/cash");

                                    var oImg = document.createElement("img");
                                    oImg.src = sAppPath + "/images/Logo2.jpg"; 
                                    oImg.style.height = "3.2rem"; // Ajuste o tamanho conforme desejado
                                    oImg.style.verticalAlign = "middle";
                                    
                                    oParent.appendChild(oImg);
                                }
                                break;
                            }
                        }
                    }
                });
            },

            onBeforeRendering: function () {
                UIHelper.onBeforeRenderingIconsAndEmail(this);
            },

            onAfterRendering: function () {
                UIHelper.onAfterRenderingMutationObserver(this);
            },

            // --- ATP ---
            onVerificarATPCustom: function () {
                ATPHandler.onVerificarATPCustom(this);
            },

            onExportarResultadoATP: function () {
                ATPHandler.onExportarResultadoATP(this);
            },

            onFecharResultadoATP: function () {
                ATPHandler.onFecharResultadoATP(this);
            },

            // --- Controle de Tempo ---
            onAbrirTempoProcesso: async function () {
                await TimeHandler.onAbrirTempoProcesso(this);
            },

            onAlterarDataHoraTempo: function () {
                TimeHandler.onAlterarDataHoraTempo(this);
            },

            onSalvarTempoProcesso: function () {
                TimeHandler.onSalvarTempoProcesso(this);
            },

            onFecharTempoProcesso: function () {
                TimeHandler.onFecharTempoProcesso(this);
            },

            onDepoisFecharTempoProcesso: function () {
                TimeHandler.onDepoisFecharTempoProcesso(this);
            },

            // --- Impressão ---
            onImprimirCustom: function () {
                PrintHandler.onImprimirCustom(this);
            },

            // --- Send ---
            onSendCustom: function () {
                UIHelper.onSendCustom(this);
            },
           onLimparSelecaoCustom: function () {
                var oSmartTable = this.byId("listReport");
                if (oSmartTable) {
                    var oTable = oSmartTable.getTable();
                    if (oTable) {
                        // Obtém o plugin de seleção associado à tabela (MultiSelectionPlugin)
                        var oPlugin = oTable.getPlugins().find(function(p) {
                            return p.isA("sap.ui.table.plugins.MultiSelectionPlugin") || typeof p.clearSelection === "function";
                        });
                        
                        if (oPlugin && typeof oPlugin.clearSelection === "function") {
                            oPlugin.clearSelection();
                        }
                    }
                }
            }

        }
    );
});