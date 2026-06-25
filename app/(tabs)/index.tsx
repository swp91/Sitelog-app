import React, { useMemo } from 'react'
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
import { useRouter } from 'expo-router'
import { dayTotal, dayEntries, allSitesDayTotal, ymd, addDays, fmtKShort, wonShort, wonFmt } from '../../lib/utils'
import type { SiteStatus, Site } from '../../lib/types'
import { LayoutDashboard, Users, ChevronRight, Briefcase } from 'lucide-react-native'

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)
const todayStr = ymd(TODAY)

const statusTone: Record<SiteStatus, string> = {
  '진행중': '#e0f2fe', // light blue background
  '마감임박': '#fef3c7', // light amber background
  '완료': '#f1f5f9', // light slate background
}

const statusText: Record<SiteStatus, string> = {
  '진행중': '#0284c7', // sky-600
  '마감임박': '#d97706', // amber-600
  '완료': '#475569', // slate-600
}

export default function DashboardScreen() {
  const { user, sites, trades, records } = useAppStore()
  const router = useRouter()

  // 1. 최근 7일 출근 총합 계산 (바 차트용)
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(TODAY, i - 6)
      const total = allSitesDayTotal(records, sites.map((s) => s.id), ymd(d))
      return { date: d, total }
    })
  }, [records, sites])
  
  const maxDay = useMemo(() => {
    return Math.max(...last7.map((d) => d.total), 1)
  }, [last7])

  // 2. 현장별 누적 투입 인건비 계산 (가로 막대 그래프용)
  const siteCosts = useMemo(() => {
    return sites.map((site) => {
      let siteCost = 0
      for (const [key, dayRec] of Object.entries(records)) {
        if (key.startsWith(`${site.id}|`)) {
          for (const [tid, entry] of Object.entries(dayRec)) {
            const trade = trades.find((t) => t.id === tid)
            if (trade && entry.count > 0) {
              siteCost += entry.count * trade.rate
            }
          }
        }
      }
      return {
        site,
        cost: siteCost
      }
    }).filter((item) => item.cost > 0).sort((a, b) => b.cost - a.cost)
  }, [records, sites, trades])

  const maxSiteCost = useMemo(() => {
    return Math.max(...siteCosts.map((s) => s.cost), 1)
  }, [siteCosts])

  const activeSites = sites.filter((s) => s.status !== '완료')
  const todayTotalCount = allSitesDayTotal(records, sites.map((s) => s.id), todayStr)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '좋은 아침이에요,' : hour < 18 ? '안녕하세요,' : '오늘 하루도 수고하셨어요,'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header / Greeting */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName}>{user.name || '사용자'} 님</Text>
        </View>

        {/* Hero Cards Grid */}
        <View style={styles.heroGrid}>
          {/* Today Attendance Card */}
          <View style={[styles.heroCard, styles.gradientBlue]}>
            <Text style={styles.heroCardLabel}>오늘 전체 출근</Text>
            <View style={styles.heroCardValueContainer}>
              <Text style={styles.heroCardValue}>{todayTotalCount}</Text>
              <Text style={styles.heroCardUnit}>명</Text>
            </View>
            <View style={styles.heroCardFooter}>
              <Text style={styles.heroCardFooterText}>진행 중 {activeSites.length}개 현장</Text>
            </View>
          </View>

          {/* 7-day trend bar chart */}
          <View style={[styles.heroCard, styles.whiteCard]}>
            <Text style={styles.chartTitle}>최근 7일 출근 추이</Text>
            <View style={styles.barChartContainer}>
              {last7.map(({ date, total }, i) => {
                const isToday = i === 6
                const heightPct = (total / maxDay) * 100
                return (
                  <View key={i} style={styles.barChartItem}>
                    <View style={styles.barWrapper}>
                      <View 
                        style={[
                          styles.bar, 
                          isToday ? styles.barActive : styles.barInactive,
                          { height: `${Math.max(heightPct, 8)}%` }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.barLabel, isToday && styles.barLabelActive]}>
                      {fmtKShort(date)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        </View>

        {/* 현장별 투입 인건비 현황 (ProgressBar 대체 구현) */}
        {siteCosts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>현장별 누적 인건비 현황</Text>
              <Text style={styles.sectionSubtitle}>각 현장별로 누적 투입된 총 노무비 소진 비율입니다.</Text>
            </View>
            <View style={styles.cardList}>
              {siteCosts.slice(0, 4).map(({ site, cost }) => {
                const progressWidth = (cost / maxSiteCost) * 100
                return (
                  <View key={site.id} style={styles.progressItem}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressName} numberOfLines={1}>{site.name}</Text>
                      <Text style={styles.progressValue}>{wonShort(cost)}원</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${progressWidth}%` }]} />
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Active Sites / Today Status List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>현장별 오늘 출근 현황</Text>
          </View>
          <View style={styles.siteList}>
            {activeSites.length === 0 ? (
              <View style={styles.emptyState}>
                <Briefcase color="#94a3b8" size={32} />
                <Text style={styles.emptyStateText}>현재 진행 중인 현장이 없습니다.</Text>
              </View>
            ) : (
              activeSites.map((site) => {
                const total = dayTotal(records, site.id, todayStr)
                const entries = dayEntries(records, site.id, todayStr)
                const tradesToday = Object.entries(entries)
                  .map(([tid, e]) => ({ trade: trades.find((t) => t.id === tid), count: e.count }))
                  .filter((x) => x.trade)

                return (
                  <TouchableOpacity
                    key={site.id}
                    style={styles.siteCard}
                    onPress={() => router.push(`/sites/${site.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.siteCardHeader}>
                      <View style={styles.siteCardInfo}>
                        <Text style={styles.siteCardName} numberOfLines={1}>{site.name}</Text>
                        <Text style={styles.siteCardAddr} numberOfLines={1}>{site.addr || '주소 미입력'}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: statusTone[site.status] }]}>
                        <Text style={[styles.badgeText, { color: statusText[site.status] }]}>
                          {site.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.siteCardRow}>
                      <Text style={styles.siteCardLabel}>오늘 출근 인원</Text>
                      {total > 0 ? (
                        <Text style={styles.siteCardTotalText}>{total}명</Text>
                      ) : (
                        <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                          <Text style={[styles.badgeText, { color: '#d97706' }]}>미입력</Text>
                        </View>
                      )}
                    </View>

                    {tradesToday.length > 0 && (
                      <View style={styles.tradeChipsContainer}>
                        {tradesToday.map(({ trade, count }) => (
                          <View key={trade!.id} style={styles.tradeChip}>
                            <View style={[styles.tradeChipColor, { backgroundColor: trade!.color }]} />
                            <Text style={styles.tradeChipText}>
                              {trade!.name} {count}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  heroGrid: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  heroCard: {
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gradientBlue: {
    backgroundColor: '#2563eb', // Brand Blue
  },
  whiteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heroCardLabel: {
    fontSize: 13,
    color: '#93c5fd',
    fontWeight: '600',
  },
  heroCardValueContainer: {
    flexDirection: 'row',
    alignItems: 'end',
    marginTop: 8,
    marginBottom: 12,
  },
  heroCardValue: {
    fontSize: 40,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 44,
  },
  heroCardUnit: {
    fontSize: 16,
    color: '#bfdbfe',
    fontWeight: '600',
    marginLeft: 4,
    marginBottom: 4,
  },
  heroCardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 10,
  },
  heroCardFooterText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 96,
  },
  barChartItem: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 72,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: 14,
    borderRadius: 4,
  },
  barActive: {
    backgroundColor: '#2563eb',
  },
  barInactive: {
    backgroundColor: '#dbeafe',
  },
  barLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
    fontWeight: '600',
  },
  barLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cardList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  progressItem: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  siteList: {
    gap: 10,
  },
  siteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  siteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  siteCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  siteCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  siteCardAddr: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  siteCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  siteCardLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  siteCardTotalText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  tradeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  tradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tradeChipColor: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tradeChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 10,
    fontWeight: '500',
  },
})
