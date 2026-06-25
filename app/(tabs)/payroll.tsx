import React, { useState, useMemo } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform
} from 'react-native'
import { useAppStore } from '../../stores/app-store'
import { tradeManDays, ymd, startOfMonth, endOfMonth, wonFmt, wonShort, shareText } from '../../lib/utils'
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react-native'
import { useColorScheme } from '@/components/useColorScheme'

const TODAY = new Date()

export default function PayrollScreen() {
  const { sites, trades, records } = useAppStore()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const [month, setMonth] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [siteFilter, setSiteFilter] = useState<string | null>(null)

  const fromStr = ymd(startOfMonth(month))
  const toStr = ymd(endOfMonth(month))
  const filteredSiteIds = siteFilter ? [siteFilter] : sites.map((s) => s.id)

  const manDays = useMemo(() => {
    return tradeManDays(records, filteredSiteIds, fromStr, toStr)
  }, [records, filteredSiteIds, fromStr, toStr])

  const rows = useMemo(() => {
    return trades
      .map((t) => ({
        trade: t,
        manDay: manDays[t.id] ?? 0,
        cost: (manDays[t.id] ?? 0) * t.rate,
      }))
      .filter((r) => r.manDay > 0)
      .sort((a, b) => b.cost - a.cost)
  }, [trades, manDays])

  const totalCost = useMemo(() => rows.reduce((s, r) => s + r.cost, 0), [rows])
  const totalManDay = useMemo(() => rows.reduce((s, r) => s + r.manDay, 0), [rows])

  // 모바일 특화: 카카오톡 또는 외부 앱에 노무비 정산 결과 공유하기
  async function handleShare() {
    const monthLabel = `${month.getFullYear()}년 ${month.getMonth() + 1}월`
    const siteName = siteFilter ? sites.find(s => s.id === siteFilter)?.name : '전체 현장'
    
    let shareMessage = `[SiteLog 노무비 정산서]\n📅 대상월: ${monthLabel}\n📍 현장: ${siteName}\n💰 총 노무비: ${wonFmt(totalCost)}원\n👷 총 투입공수: ${totalManDay} man-day\n\n[상세 내역]`
    
    rows.forEach(({ trade, manDay, cost }) => {
      shareMessage += `\n- ${trade.name}: ${manDay}공수 / ${wonFmt(cost)}원`
    })

    await shareText({
      title: `${monthLabel} 노무비 정산`,
      text: shareMessage,
    })
  }

  const themeContainerStyle = isDark ? styles.darkContainer : styles.lightContainer
  const themeCardStyle = isDark ? styles.darkCard : styles.lightCard
  const themeTextStyle = isDark ? styles.darkText : styles.lightText
  const themeBorderColor = isDark ? '#334155' : '#e2e8f0'

  return (
    <SafeAreaView style={[styles.container, themeContainerStyle]}>
      {/* 1. Month Navigator Header */}
      <View style={[styles.monthNavContainer, isDark && styles.darkBorderBottom]}>
        <TouchableOpacity
          style={[styles.navButton, isDark && styles.darkNavButton]}
          onPress={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={isDark ? '#cbd5e1' : '#475569'} />
        </TouchableOpacity>
        <Text style={[styles.monthTitleText, themeTextStyle]}>
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </Text>
        <TouchableOpacity
          style={[styles.navButton, isDark && styles.darkNavButton]}
          onPress={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          activeOpacity={0.7}
        >
          <ChevronRight size={20} color={isDark ? '#cbd5e1' : '#475569'} />
        </TouchableOpacity>
      </View>

      {/* 2. Horizontal Scroll Site Filter Chips */}
      <View style={[styles.filterContainer, isDark && styles.darkBorderBottom]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              siteFilter === null ? styles.chipActive : styles.chipInactive,
              isDark && siteFilter === null && styles.chipActiveDark,
              isDark && siteFilter !== null && styles.chipInactiveDark
            ]}
            onPress={() => setSiteFilter(null)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.chipText,
              siteFilter === null ? styles.chipTextActive : styles.chipTextInactive,
              isDark && siteFilter === null && styles.chipTextActiveDark
            ]}>
              전체
            </Text>
          </TouchableOpacity>

          {sites.map((site) => {
            const isActive = siteFilter === site.id
            return (
              <TouchableOpacity
                key={site.id}
                style={[
                  styles.chip,
                  isActive ? styles.chipActive : styles.chipInactive,
                  isDark && isActive && styles.chipActiveDark,
                  isDark && !isActive && styles.chipInactiveDark
                ]}
                onPress={() => setSiteFilter(site.id === siteFilter ? null : site.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.chipText,
                  isActive ? styles.chipTextActive : styles.chipTextInactive,
                  isDark && isActive && styles.chipTextActiveDark
                ]}>
                  {site.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* 3. Hero Card (Total Summary) */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>총 노무비</Text>
          <View style={styles.heroValueContainer}>
            <Text style={styles.heroValue}>{wonFmt(totalCost)}</Text>
            <Text style={styles.heroUnit}>원</Text>
          </View>
          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>총 {totalManDay} man-day</Text>
          </View>
        </View>

        {/* 4. Payroll Breakdown List (Replacing traditional HTML Table) */}
        <View style={[styles.card, themeCardStyle]}>
          <View style={[styles.cardHeader, { borderBottomColor: themeBorderColor }]}>
            <Text style={[styles.cardTitle, themeTextStyle]}>공종별 노무비 명세</Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share2 color="#2563eb" size={14} style={styles.shareButtonIcon} />
              <Text style={styles.shareButtonText}>정산 공유</Text>
            </TouchableOpacity>
          </View>

          {rows.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>해당 월의 출근 및 노무비 기록이 없습니다.</Text>
            </View>
          ) : (
            <View>
              {/* Header row for list */}
              <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: themeBorderColor }]}>
                <Text style={[styles.colName, styles.headerLabel]}>공종 · 업체</Text>
                <Text style={[styles.colRate, styles.headerLabel, styles.textRight]}>일당</Text>
                <Text style={[styles.colManDay, styles.headerLabel, styles.textRight]}>공수</Text>
                <Text style={[styles.colCost, styles.headerLabel, styles.textRight]}>노무비</Text>
              </View>

              {/* Data rows */}
              {rows.map(({ trade, manDay, cost }) => (
                <View 
                  key={trade.id} 
                  style={[styles.tableRow, { borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                >
                  <View style={styles.colName}>
                    <View style={styles.nameRow}>
                      <View style={[styles.tradeDot, { backgroundColor: trade.color }]} />
                      <View style={styles.tradeNameContainer}>
                        <Text style={[styles.tradeNameText, themeTextStyle]} numberOfLines={1}>
                          {trade.name}
                        </Text>
                        {trade.company ? (
                          <Text style={styles.companyText} numberOfLines={1}>{trade.company}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.colRate, styles.dataText, styles.textRight]}>
                    {wonFmt(trade.rate)}
                  </Text>
                  <Text style={[styles.colManDay, styles.dataText, styles.textRight, styles.boldText, themeTextStyle]}>
                    {manDay}
                  </Text>
                  <Text style={[styles.colCost, styles.dataText, styles.textRight, styles.boldText, styles.blueText]}>
                    {wonShort(cost)}
                  </Text>
                </View>
              ))}

              {/* Total Summary Row */}
              <View style={styles.tableTotalRow}>
                <Text style={[styles.totalLabelText, themeTextStyle]}>합계</Text>
                <Text style={[styles.totalManDayText, themeTextStyle]}>{totalManDay}공수</Text>
                <Text style={styles.totalCostText}>{wonFmt(totalCost)}원</Text>
              </View>
            </View>
          )}
        </View>

        {/* 5. Cost Proportions (Bar Chart Section) */}
        {rows.length > 0 && (
          <View style={[styles.card, themeCardStyle, styles.lastCard]}>
            <Text style={[styles.cardTitle, themeTextStyle, styles.chartSectionTitle]}>공종별 노무비 비중</Text>
            <View style={styles.chartContainer}>
              {rows.map(({ trade, cost }) => {
                const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0
                return (
                  <View key={trade.id} style={styles.chartItem}>
                    <View style={styles.chartLabelRow}>
                      <View style={styles.chartNameRow}>
                        <View style={[styles.tradeDot, { backgroundColor: trade.color }]} />
                        <Text style={[styles.chartTradeName, themeTextStyle]} numberOfLines={1}>
                          {trade.name}
                        </Text>
                      </View>
                      <View style={styles.chartValueRow}>
                        <Text style={[styles.chartCostText, themeTextStyle]}>{wonShort(cost)}</Text>
                        <Text style={styles.chartPctText}>{pct.toFixed(0)}%</Text>
                      </View>
                    </View>
                    <View style={styles.chartBarBg}>
                      <View 
                        style={[
                          styles.chartBarFill, 
                          { width: `${pct}%`, backgroundColor: trade.color }
                        ]} 
                      />
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#f8fafc',
  },
  darkContainer: {
    backgroundColor: '#0f172a',
  },
  monthNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkBorderBottom: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkNavButton: {
    backgroundColor: '#1e293b',
  },
  monthTitleText: {
    fontSize: 18,
    fontWeight: '800',
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  chipActiveDark: {
    backgroundColor: '#1e3a8a',
    borderColor: '#2563eb',
  },
  chipInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  chipInactiveDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#1d4ed8',
  },
  chipTextActiveDark: {
    color: '#dbeafe',
  },
  chipTextInactive: {
    color: '#64748b',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#2563eb', // Brand Blue
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroLabel: {
    fontSize: 13,
    color: '#bfdbfe',
    fontWeight: '600',
  },
  heroValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 12,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 38,
  },
  heroUnit: {
    fontSize: 16,
    color: '#bfdbfe',
    fontWeight: '600',
    marginLeft: 4,
    marginBottom: 2,
  },
  heroFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 10,
  },
  heroFooterText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  lastCard: {
    marginBottom: 8,
  },
  lightCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  chartSectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 14,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 28,
  },
  shareButtonIcon: {
    marginRight: 4,
  },
  shareButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tableHeader: {
    backgroundColor: 'rgba(241, 245, 249, 0.4)',
  },
  colName: {
    flex: 3.5, // 35% width
  },
  colRate: {
    flex: 2.2, // 22% width
  },
  colManDay: {
    flex: 1.8, // 18% width
  },
  colCost: {
    flex: 2.5, // 25% width
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  dataText: {
    fontSize: 13,
  },
  textRight: {
    textAlign: 'right',
  },
  boldText: {
    fontWeight: '700',
  },
  blueText: {
    color: '#2563eb',
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tradeNameContainer: {
    flex: 1,
    marginRight: 4,
  },
  tradeNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  companyText: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 1,
    fontWeight: '500',
  },
  tableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  totalLabelText: {
    flex: 5.7, // 합쳐서 colName + colRate 대응
    fontSize: 14,
    fontWeight: '800',
  },
  totalManDayText: {
    flex: 1.8,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  totalCostText: {
    flex: 2.5,
    fontSize: 15,
    fontWeight: '900',
    color: '#2563eb',
    textAlign: 'right',
  },
  chartContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  chartItem: {
    flexDirection: 'column',
  },
  chartLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.5,
    marginRight: 8,
  },
  chartTradeName: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartCostText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartPctText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    width: 28,
    textAlign: 'right',
  },
  chartBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  lightText: {
    color: '#0f172a',
  },
  darkText: {
    color: '#f8fafc',
  },
})
