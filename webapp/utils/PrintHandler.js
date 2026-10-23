sap.ui.define([
    "sap/m/MessageBox"
], function (
    MessageBox
) {
    "use strict";

    return {
        onImprimirCustom: function (oController) {
            var aContextosSelecionados = oController.extensionAPI.getSelectedContexts();

            if (!aContextosSelecionados || aContextosSelecionados.length === 0) {
                MessageBox.warning("Selecione pelo menos um pedido para impressão.");
                return;
            }

            var aPedidos = aContextosSelecionados.map(function (oContexto) {
                return oContexto.getObject();
            });

            var sDocumento = this._montarDocumentoImpressao(aPedidos);

            var oIframe = document.createElement("iframe");
            oIframe.style.position = "fixed";
            oIframe.style.right = "0";
            oIframe.style.bottom = "0";
            oIframe.style.width = "0";
            oIframe.style.height = "0";
            oIframe.style.border = "0";
            oIframe.style.visibility = "hidden";

            document.body.appendChild(oIframe);

            var oDocumento = oIframe.contentWindow.document;
            oDocumento.open();
            oDocumento.write(sDocumento);
            oDocumento.close();

            oIframe.onload = function () {
                setTimeout(function () {
                    oIframe.contentWindow.focus();
                    oIframe.contentWindow.print();

                    setTimeout(function () {
                        if (oIframe.parentNode) {
                            oIframe.parentNode.removeChild(oIframe);
                        }
                    }, 1000);
                }, 300);
            };
        },

        _montarDocumentoImpressao: function (aPedidos) {
            var oAgora = new Date();
            var sDataImpressao = String(oAgora.getDate()).padStart(2, "0") + "/" + String(oAgora.getMonth() + 1).padStart(2, "0") + "/" + oAgora.getFullYear();
            var sHoraImpressao = String(oAgora.getHours()).padStart(2, "0") + ":" + String(oAgora.getMinutes()).padStart(2, "0");
            var sLinhas = "";

            aPedidos.forEach(function (oPedido) {
                var sPedido = oPedido.PedidoVenda || oPedido.NumeroPedido || oPedido.Pedido || "";
                var sTipo = oPedido.TipoPedidoVenda || oPedido.TipoDocumento || oPedido.Tipo || "";
                var sCliente = oPedido.Cliente || oPedido.SoldToParty || "";
                var sNomeCliente = oPedido.NomeCliente || oPedido.NomeDoCliente || "";
                var sReferencia = oPedido.ReferenciaCliente || oPedido.ReferenciaDoCliente || "";
                var sValorLiquido = oPedido.ValorLiquido || oPedido.ValorLiquidoDocumento || "";
                var sMoeda = oPedido.Moeda || "";

                sLinhas +=
                    "<tr>" +
                        "<td>" + this._escaparHTML(sPedido) + "</td>" +
                        "<td>" + this._escaparHTML(sTipo) + "</td>" +
                        "<td>" + this._escaparHTML(sCliente) + "</td>" +
                        "<td>" + this._escaparHTML(sNomeCliente) + "</td>" +
                        "<td>" + this._escaparHTML(sReferencia) + "</td>" +
                        "<td class='valor'>" + this._escaparHTML(sValorLiquido) + "</td>" +
                        "<td>" + this._escaparHTML(sMoeda) + "</td>" +
                    "</tr>";
            }.bind(this));

            return `
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="UTF-8">
            <title>Pedidos de Venda</title>
            <style>
            @page { size: A4 landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 0; font-size: 10pt; }
            .cabecalho { border-bottom: 2px solid #1a4f8b; padding-bottom: 12px; margin-bottom: 18px; }
            .titulo { font-size: 20pt; font-weight: bold; color: #123b68; margin-bottom: 5px; }
            .subtitulo { font-size: 10pt; color: #64748b; }
            .informacoes { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 9pt; color: #475569; }
            .informacoes strong { color: #1e293b; }
            .resumo { border: 1px solid #d7dee8; background: #f5f8fc; padding: 10px 14px; margin-bottom: 18px; }
            .resumo-titulo { font-weight: bold; margin-bottom: 5px; }
            .resumo-total { font-size: 15pt; font-weight: bold; color: #123b68; }
            table { width: 100%; border-collapse: collapse; }
            thead { display: table-header-group; }
            th { background: #123b68; color: white; font-weight: bold; text-align: left; padding: 8px; border: 1px solid #123b68; }
            td { padding: 7px 8px; border: 1px solid #d7dee8; vertical-align: middle; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .valor { text-align: right; white-space: nowrap; }
            tr { page-break-inside: avoid; }
            .rodape { margin-top: 18px; padding-top: 8px; border-top: 1px solid #d7dee8; font-size: 8pt; color: #64748b; text-align: center; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
            </head>
            <body>
                <div class="cabecalho">
                    <div class="titulo">Pedidos de Venda</div>
                    <div class="subtitulo">Relatório de pedidos selecionados</div>
                </div>
                <div class="informacoes">
                    <div><strong>Quantidade de pedidos:</strong> ${aPedidos.length}</div>
                    <div><strong>Data:</strong> ${sDataImpressao}</div>
                    <div><strong>Hora:</strong> ${sHoraImpressao}</div>
                </div>
                <div class="resumo">
                    <div class="resumo-titulo">Resumo da impressão</div>
                    <div class="resumo-total">${aPedidos.length} pedido(s) selecionado(s)</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Tipo</th>
                            <th>Cliente</th>
                            <th>Nome do cliente</th>
                            <th>Referência do cliente</th>
                            <th>Valor líquido</th>
                            <th>Moeda</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sLinhas}
                    </tbody>
                </table>
                <div class="rodape">Documento gerado pelo Monitor OTC &nbsp;|&nbsp; ${sDataImpressao} ${sHoraImpressao}</div>
            </body>
            </html>
            `;
        },

        _escaparHTML: function (vValor) {
            if (vValor === null || vValor === undefined) {
                return "";
            }
            return String(vValor)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    };
});