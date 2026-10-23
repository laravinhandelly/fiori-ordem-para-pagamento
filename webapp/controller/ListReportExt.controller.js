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

                var that = this;

                // Aguarda o SmartFilterBar ser inicializado
                var oFilterBar = this.byId("listReportFilter");
                if (oFilterBar) {
                    oFilterBar.attachInitialized(function (oEvent) {
                        var oSmartFilterBar = oEvent.getSource();
                        oSmartFilterBar.setLiveMode(true);
                    });

                    // Reaplicar a logo sempre que houver busca ou alteração de filtros
                    oFilterBar.attachSearch(function () {
                        setTimeout(function () { that._applyLogo(); }, 300);
                    }, this);
                    
                    oFilterBar.attachFilterChange(function () {
                        setTimeout(function () { that._applyLogo(); }, 300);
                    }, this);
                }
            },

            onAfterRendering: function () {
                this._applyLogo();
                this._initMutationObserver();
            },

            _applyLogo: function () {
                var aVariantLinks = document.querySelectorAll(".sapMText, .sapMTitle, .sapUICompVarMgtBtn");
                for (var i = 0; i < aVariantLinks.length; i++) {
                    var sText = aVariantLinks[i].innerText ? aVariantLinks[i].innerText.trim() : "";
                    
                    // Verifica se contém Standard, Padrão (mesmo com * de modificado) ou AGGIRE
                    if (sText.includes("Standard") || sText.includes("Padrão") || sText.includes("AGGIRE")) {
                        var oParent = aVariantLinks[i];

                        // Se ainda não tem a imagem inserida dentro dele
                        if (!oParent.querySelector("img.customAggireLogo")) {
                            oParent.innerHTML = ""; // Limpa o texto anterior

                            var sAppPath = sap.ui.require.toUrl("com/mooviordem/zui5/ordem/to/cash");

                            var oImg = document.createElement("img");
                            oImg.src = sAppPath + "/images/Logo2.jpg";
                            oImg.className = "customAggireLogo";
                            oImg.style.height = "2.8rem"; 
                            oImg.style.verticalAlign = "middle";

                            oParent.appendChild(oImg);
                        }
                        break;
                    }
                }
            },

            _initMutationObserver: function () {
                var that = this;
                // Observa alterações no DOM do cabeçalho para recolocar a logo caso o Fiori limpe o elemento
                var oTarget = document.querySelector(".sapUICompVarMgt");
                if (oTarget && !this._logoObserver) {
                    this._logoObserver = new MutationObserver(function () {
                        that._applyLogo();
                    });
                    this._logoObserver.observe(oTarget, { childList: true, subtree: true });
                }
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