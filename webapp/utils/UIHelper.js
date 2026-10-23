
sap.ui.define([
    "sap/m/MessageBox"
], function (
    MessageBox
) {
    "use strict";

    // Mantém apenas um observador ativo para o diálogo de e-mail
    var oEmailDialogObserver = null;

    return {

        // =========================================================
        // Ícones dos botões da List Report
        // =========================================================
        onBeforeRenderingIconsAndEmail: function (oController) {

            // Adicionar o ícone para o botão Limpar Seleção
            var oButton = oController.getView().byId("btnLimparSelecao");
            if (oButton) {
                oButton.setIcon("sap-icon://reset");
            }

            var oButton = oController.getView().byId("btnVerificarATPCustom");

            if (oButton) {
                oButton.setIcon("sap-icon://activity-2");
            }

            oButton = oController.getView().byId("btnControleTempo");

            if (oButton) {
                oButton.setIcon("sap-icon://lateness");
            }

            oButton = oController.getView().byId("btnImprimirCustom");

            if (oButton) {
                oButton.setIcon("sap-icon://print");
            }

            oButton = oController.getView().byId("btnSendCustom");

            if (oButton) {
                oButton.setIcon("sap-icon://paper-plane");
            }

            // Botão padrão da ação EnviarEmail
            var oBtnEmail = sap.ui.getCore().byId(
                "com.mooviordem.zui5.ordem.to.cash::sap.suite.ui.generic.template.ListReport.view.ListReport::MonitorOTC--action::cds_zui_sd_otc_monitor.cds_zui_sd_otc_monitor_Entities::EnviarEmail"
            );

            if (oBtnEmail) {
                oBtnEmail.setIcon("sap-icon://email");
                oBtnEmail.setText("Enviar E-mail");

                if (oBtnEmail.setShowText) {
                    oBtnEmail.setShowText(true);
                }
            }
        },


        // =========================================================
        // Ajusta título e botão de confirmação do diálogo de e-mail
        // =========================================================
        onAfterRenderingMutationObserver: function () {

            // Evita criar observadores duplicados
            if (oEmailDialogObserver) {
                return;
            }

            if (!document.body || !window.MutationObserver) {
                return;
            }

            function ajustarDialogoEmail() {

                var aDialogs = document.querySelectorAll(".sapMDialog");

                aDialogs.forEach(function (oDialogDom) {

                    // Procura exclusivamente o campo do parâmetro de e-mail
                    var oCampoEmail = oDialogDom.querySelector(
                        'input[id*="EmailDestinatario"],' +
                        'input[name*="EmailDestinatario"]'
                    );

                    // Se não for o diálogo de e-mail, não altera nada
                    if (!oCampoEmail) {
                        return;
                    }
                    /*
                    * Ajusta o rótulo do campo EmailDestinatario
                    * somente no diálogo de envio de e-mail.
                    */
                    var sLabelEmail = "E-mail do Destinatário";

                    var aLabels = oDialogDom.querySelectorAll("label");

                    aLabels.forEach(function (oLabelDom) {

                        // Verifica se este label está associado ao input de e-mail
                        if (oLabelDom.getAttribute("for") !== oCampoEmail.id) {
                            return;
                        }

                        // Recupera o controle SAPUI5 correspondente ao label
                        var oLabel = sap.ui.getCore().byId(oLabelDom.id);

                        if (oLabel && oLabel.setText) {
                            if (oLabel.getText() !== sLabelEmail) {
                                oLabel.setText(sLabelEmail);
                            }
                        }
                    });

                    var oDialog = sap.ui.getCore().byId(oDialogDom.id);

                    if (!oDialog || !oDialog.getButtons) {
                        return;
                    }

                    var aButtons = oDialog.getButtons();

                    // Localiza o botão enfatizado de confirmação
                    var oButtonConfirmar = aButtons.find(function (oButton) {
                        return oButton.getType &&
                            oButton.getType() === "Emphasized";
                    });

                    if (!oButtonConfirmar) {
                        return;
                    }

                    // Define o título somente no diálogo de e-mail
                    var sTituloEmail = "Enviar pedido de venda por e-mail";

                    if (oDialog.getTitle() !== sTituloEmail) {
                        oDialog.setTitle(sTituloEmail);
                    }

                    // Define o texto somente no botão de confirmação do e-mail
                    if (oButtonConfirmar.getText() !== "Enviar E-mail") {
                        oButtonConfirmar.setText("Enviar E-mail");
                    }
                });
            }

            // Observa a abertura e as alterações dos diálogos
            oEmailDialogObserver = new MutationObserver(function () {
                ajustarDialogoEmail();
            });

            oEmailDialogObserver.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Verifica também se já existe um diálogo aberto
            ajustarDialogoEmail();
        },


        // =========================================================
        // Envio para a aplicação externa
        // =========================================================
        onSendCustom: function (oController) {

            var aContextosSelecionados =
                oController.extensionAPI.getSelectedContexts();

            if (
                !aContextosSelecionados ||
                aContextosSelecionados.length === 0
            ) {
                MessageBox.warning(
                    "Selecione pelo menos um pedido para envio."
                );

                return;
            }

            var aPedidos = aContextosSelecionados.map(function (oContexto) {
                return oContexto.getObject();
            });

            var aNumerosPedidos = aPedidos.map(function (oPedido) {

                return (
                    oPedido.PedidoVenda ||
                    oPedido.NumeroPedido ||
                    oPedido.Pedido ||
                    oPedido.Vbeln ||
                    oPedido.vbeln ||
                    ""
                );

            }).filter(Boolean);

            if (aNumerosPedidos.length === 0) {
                MessageBox.error(
                    "Não foi possível identificar os números dos pedidos selecionados."
                );

                return;
            }

            var aPedidosUnicos = Array.from(
                new Set(aNumerosPedidos)
            );

            this._abrirAplicacaoSend(aPedidosUnicos);
        },


        // =========================================================
        // Monta e abre o Deep Link da aplicação Send
        // =========================================================
        _abrirAplicacaoSend: function (aPedidos) {

            var sOrdens = aPedidos.join(",");

            var sDeepLink =
                "https://ndc-srvhana.opus-idc.com.br:8100" +
                "/sap/bc/ui2/flp" +
                "?sap-client=250" +
                "&sap-language=PT" +
                "&sap-accessibility=X" +
                "#zebgs_selecta_obj_sema-display" +
                "?s_ordem=" +
                encodeURIComponent(sOrdens);

            window.open(sDeepLink, "_blank");
        }

    };
});
