import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { AppConfig } from '../../contexts/ConfigContext';
import { formatCurrency, formatDate } from '../../lib/utils';

// Estilos
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: '1 solid #e5e5e5',
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  documentTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#2563eb', // primary color
  },
  documentSubtitle: {
    fontSize: 10,
    color: '#666',
  },
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
  },
  customerCol: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  customerData: {
    fontSize: 10,
    marginBottom: 4,
  },
  table: {
    width: '100%',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e5e5',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottom: '1 solid #f1f5f9',
  },
  colDesc: { flex: 3 },
  colCant: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1, textAlign: 'right' },
  colDescItem: { flex: 1, textAlign: 'right', color: '#64748b' },
  colTotal: { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  colHeader: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 2,
  },
  itemCode: {
    fontSize: 8,
    color: '#64748b',
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  totalsBox: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottom: '1 solid #f1f5f9',
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 4,
    borderTop: '2 solid #1a1a1a',
  },
  totalLabel: {
    color: '#64748b',
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
  },
  finalTotalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
  finalTotalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#2563eb',
  },
  notesSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1 solid #e5e5e5',
  },
  notesText: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTop: '1 solid #e5e5e5',
    paddingTop: 10,
  }
});

interface VentaPDFProps {
  venta: any;
  config: AppConfig | null;
}

export const VentaPDF: React.FC<VentaPDFProps> = ({ venta, config }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {config?.logo_url ? (
              <Image src={config.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{config?.nombre_app || 'Gestión Pro'}</Text>
            )}
            {config?.razon_social && <Text style={styles.companyInfo}>{config.razon_social}</Text>}
            {config?.cuit && <Text style={styles.companyInfo}>CUIT: {config.cuit}</Text>}
            {config?.direccion && <Text style={styles.companyInfo}>{config.direccion}</Text>}
            {config?.telefono && <Text style={styles.companyInfo}>Tel: {config.telefono}</Text>}
            {config?.email_empresa && <Text style={styles.companyInfo}>{config.email_empresa}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.documentTitle}>COMPROBANTE</Text>
            <Text style={styles.documentSubtitle}>N° {venta.numero.toString().padStart(7, '0')}</Text>
            <Text style={styles.documentSubtitle}>Fecha: {formatDate(venta.fecha)}</Text>
            <Text style={styles.documentSubtitle}>Vendedor: {venta.profiles?.nombre}</Text>
          </View>
        </View>

        {/* Cliente Info */}
        <View style={styles.customerSection}>
          <View style={styles.customerCol}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <Text style={styles.customerData}>{venta.clientes?.razon_social || 'Consumidor Final'}</Text>
            {venta.clientes?.cuit && <Text style={styles.customerData}>CUIT/DNI: {venta.clientes.cuit}</Text>}
            {venta.clientes?.telefono && <Text style={styles.customerData}>Tel: {venta.clientes.telefono}</Text>}
            {venta.clientes?.email && <Text style={styles.customerData}>Email: {venta.clientes.email}</Text>}
          </View>
          <View style={styles.customerCol}>
            <Text style={styles.sectionTitle}>Condiciones</Text>
            <Text style={styles.customerData}>Estado: {venta.estado.toUpperCase().replace('_', ' ')}</Text>
            {venta.fecha_entrega && <Text style={styles.customerData}>Entrega: {formatDate(venta.fecha_entrega)}</Text>}
          </View>
        </View>

        {/* Tabla de Ítems */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colHeader, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.colHeader, styles.colCant]}>Cant.</Text>
            <Text style={[styles.colHeader, styles.colPrice]}>P. Unit.</Text>
            <Text style={[styles.colHeader, styles.colDescItem]}>Desc.</Text>
            <Text style={[styles.colHeader, styles.colTotal]}>Subtotal</Text>
          </View>

          {venta.venta_items?.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.itemTitle}>{item.productos?.nombre || item.descripcion}</Text>
                {item.productos?.codigo && <Text style={styles.itemCode}>{item.productos.codigo}</Text>}
              </View>
              <Text style={styles.colCant}>{item.cantidad}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.precio_unitario)}</Text>
              <Text style={styles.colDescItem}>{formatCurrency(item.descuento)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(venta.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Descuento Total</Text>
              <Text style={styles.totalValue}>- {formatCurrency(venta.descuento)}</Text>
            </View>
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>TOTAL</Text>
              <Text style={styles.finalTotalValue}>{formatCurrency(venta.total)}</Text>
            </View>
            {venta.saldo_pendiente > 0 && (
              <View style={[styles.totalRow, { marginTop: 10, borderBottom: 'none' }]}>
                <Text style={styles.totalLabel}>Saldo Pendiente</Text>
                <Text style={[styles.totalValue, { color: '#ef4444' }]}>{formatCurrency(venta.saldo_pendiente)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notas */}
        {venta.notas && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notas y Observaciones</Text>
            <Text style={styles.notesText}>{venta.notas}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Documento generado el {new Date().toLocaleString()} por {config?.nombre_app || 'Gestión Pro'}
        </Text>
      </Page>
    </Document>
  );
};
