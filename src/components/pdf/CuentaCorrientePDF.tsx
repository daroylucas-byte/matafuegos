import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { AppConfig } from '../../contexts/ConfigContext';
import { formatCurrency, formatDate } from '../../lib/utils';

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
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#2563eb',
  },
  documentSubtitle: {
    fontSize: 10,
    color: '#666',
  },
  entitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
  },
  entityCol: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  entityData: {
    fontSize: 10,
    marginBottom: 4,
  },
  entityName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
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
    paddingVertical: 6,
    borderBottom: '1 solid #f1f5f9',
  },
  colDate: { flex: 1.5 },
  colConcept: { flex: 4 },
  colDebe: { flex: 1.5, textAlign: 'right' },
  colHaber: { flex: 1.5, textAlign: 'right' },
  colSaldo: { flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  colHeader: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  totalsBox: {
    width: 250,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
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

interface CuentaCorrientePDFProps {
  entity: any;
  movimientos: any[];
  config: AppConfig | null;
  type: 'cliente' | 'proveedor';
}

export const CuentaCorrientePDF: React.FC<CuentaCorrientePDFProps> = ({ entity, movimientos, config, type }) => {
  const isCliente = type === 'cliente';
  
  // Calculate totals
  const totalDebe = movimientos.reduce((acc, m) => acc + (m.debe || 0), 0);
  const totalHaber = movimientos.reduce((acc, m) => acc + (m.haber || 0), 0);
  const currentSaldo = entity.saldo_deudor || 0;

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
            <Text style={styles.documentTitle}>ESTADO DE CUENTA</Text>
            <Text style={styles.documentSubtitle}>Fecha de Emisión: {formatDate(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Entity Info */}
        <View style={styles.entitySection}>
          <View style={styles.entityCol}>
            <Text style={styles.sectionTitle}>{isCliente ? 'Cliente' : 'Proveedor'}</Text>
            <Text style={styles.entityName}>{entity.razon_social}</Text>
            {entity.cuit && <Text style={styles.entityData}>CUIT: {entity.cuit}</Text>}
            {entity.telefono && <Text style={styles.entityData}>Tel: {entity.telefono}</Text>}
            {entity.email && <Text style={styles.entityData}>Email: {entity.email}</Text>}
          </View>
          <View style={styles.entityCol}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <Text style={styles.entityData}>Dirección: {entity.direccion || '—'}</Text>
            <Text style={styles.entityData}>Localidad: {entity.localidad || '—'}</Text>
            <Text style={styles.entityData}>
              Saldo Actual: {formatCurrency(Math.abs(currentSaldo))} 
              {isCliente 
                ? (currentSaldo > 0 ? ' (DEUDOR)' : currentSaldo < 0 ? ' (A FAVOR)' : '')
                : (currentSaldo > 0 ? ' (A PAGAR)' : currentSaldo < 0 ? ' (A FAVOR)' : '')
              }
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colHeader, styles.colDate]}>Fecha</Text>
            <Text style={[styles.colHeader, styles.colConcept]}>Concepto</Text>
            <Text style={[styles.colHeader, styles.colDebe]}>Debe</Text>
            <Text style={[styles.colHeader, styles.colHaber]}>Haber</Text>
            <Text style={[styles.colHeader, styles.colSaldo]}>Saldo</Text>
          </View>

          {movimientos.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ flex: 1, textAlign: 'center', color: '#64748b', fontSize: 9 }}>No hay movimientos registrados.</Text>
            </View>
          ) : (
            movimientos.map((m: any, i: number) => (
              <View key={m.id || i} style={styles.tableRow}>
                <Text style={styles.colDate}>{formatDate(m.fecha)}</Text>
                <Text style={styles.colConcept}>{m.descripcion}</Text>
                <Text style={styles.colDebe}>{m.debe > 0 ? formatCurrency(m.debe) : '-'}</Text>
                <Text style={styles.colHaber}>{m.haber > 0 ? formatCurrency(m.haber) : '-'}</Text>
                <Text style={styles.colSaldo}>{formatCurrency(m.saldo)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Totals Summary */}
        {movimientos.length > 0 && (
          <View style={styles.totalsSection}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Debe</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalDebe)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Haber</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalHaber)}</Text>
              </View>
              <View style={styles.finalTotalRow}>
                <Text style={styles.finalTotalLabel}>SALDO FINAL</Text>
                <Text style={[styles.finalTotalValue, { color: currentSaldo > 0 ? '#ef4444' : currentSaldo < 0 ? '#10b981' : '#1a1a1a' }]}>
                  {formatCurrency(Math.abs(currentSaldo))}
                </Text>
              </View>
            </View>
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
