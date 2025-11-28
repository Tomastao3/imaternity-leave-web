import React, { useEffect, useMemo, useState } from 'react';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import { getHolidaySets, refreshHolidayPlanCache, addHolidayChangeListener, getHolidayVersion } from '../utils/holidayUtils';

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if ([year, month, day].some(num => Number.isNaN(num))) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

// Props:
// - startDate: 'yyyy-MM-dd'
// - endDate: 'yyyy-MM-dd' (optional; if missing, will compute by totalDays)
// - totalDays: number (used when endDate missing)
const DAY_CELL_WIDTH = 55;

const LeaveCalendar = ({
  startDate,
  endDate,
  totalDays,
  visibleMonthsFormatter,
  hideLegend = false,
  containerStyle
}) => {
  const [holidayVersion, setHolidayVersion] = useState(() => getHolidayVersion());
  const { start, end } = useMemo(() => {
    if (!startDate) return { start: null, end: null };
    const s = parseLocalDate(startDate);
    let e = null;
    if (endDate) {
      const ed = parseLocalDate(endDate);
      if (!isNaN(ed.getTime())) e = ed;
    }
    if (!e && totalDays && totalDays > 0) {
      e = addDays(s, totalDays - 1);
    }
    if (!e) return { start: s, end: s };
    return { start: s, end: e };
  }, [startDate, endDate, totalDays]);

  const monthList = useMemo(() => {
    if (!start || !end) return [];
    const months = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= last) {
      months.push(new Date(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    if (typeof visibleMonthsFormatter === 'function') {
      return visibleMonthsFormatter(months, { start, end }) || months;
    }
    return months;
  }, [start, end, visibleMonthsFormatter]);

  const monthColumns = Math.max(1, Math.min(monthList.length, 4));
  const mergedContainerStyle = {
    marginTop: '16px',
    ...(containerStyle || {})
  };

  // Merge holiday sets for all involved years
  useEffect(() => {
    if (!start || !end) return;
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      refreshHolidayPlanCache(y);
    }
  }, [start, end, holidayVersion]);

  useEffect(() => {
    const unsubscribe = addHolidayChangeListener(({ years, version } = {}) => {
      if (Array.isArray(years)) {
        years.forEach((year) => {
          const numeric = Number(year);
          if (!Number.isNaN(numeric)) {
            refreshHolidayPlanCache(numeric);
          }
        });
      }
      if (Number.isFinite(version)) {
        setHolidayVersion(version);
      } else {
        setHolidayVersion((prev) => prev + 1);
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const { holidays, makeups } = useMemo(() => {
    const h = new Set();
    const m = new Set();
    if (!start || !end) return { holidays: h, makeups: m };
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      const { holidays: hs, makeupWorkdays: ms } = getHolidaySets(y);
      hs.forEach(d => h.add(d));
      ms.forEach(d => m.add(d));
    }
    return { holidays: h, makeups: m };
  }, [start, end, holidayVersion]);

  if (!start || !end) return null;


  return (
    <div style={mergedContainerStyle}>
      {/* <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>休假日历</div> */}
      {!hideLegend && (
        <>
          <Legend />
          <div><br /></div>
        </>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(360px, 1fr))`,
          gap: '8px',
          justifyItems: 'start'
        }}
      >
        {monthList.map((month) => (
          <MonthGrid
            key={format(month, 'yyyy-MM')}
            monthDate={month}
            leaveStart={start}
            leaveEnd={end}
            holidays={holidays}
            makeups={makeups}
          />
        ))}
      </div>
    </div>
  );
};

const MonthGrid = ({ monthDate, leaveStart, leaveEnd, holidays, makeups }) => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    days.push(new Date(d));
  }

  const isLeave = (d) => d >= leaveStart && d <= leaveEnd;
  const isHoliday = (d) => holidays.has(format(d, 'yyyy-MM-dd'));
  const isMakeup = (d) => makeups.has(format(d, 'yyyy-MM-dd'));
  const isWeekend = (d) => {
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  };

  const cellStyle = (d) => {
    const base = {
      padding: 6,
      border: '1px solid #eee',
      width: DAY_CELL_WIDTH,
      minHeight: DAY_CELL_WIDTH,
      fontSize: 14,
      borderRadius: 6,
      background: '#fff',
      color: '#333',
      boxSizing: 'border-box'
    };
    const outMonth = !isSameMonth(d, monthDate);
    if (outMonth) {
      base.opacity = 0.35;
      base.background = '#fafafa';
    }
    if (isHoliday(d)) {
      base.background = '#fdeaea';
      base.borderColor = '#f5c2c2';
    }
    if (isWeekend(d) && !isHoliday(d)) {
      base.background = '#faf7f1';
      base.borderColor = '#f1e0c7';
    }
    if (isMakeup(d)) {
      base.background = '#eef5ff';
      base.borderColor = '#b6d3ff';
    }
    // 仅在当月显示产假区间描边
    if (!outMonth && isLeave(d)) {
      base.boxShadow = 'inset 0 0 0 2px #28a745';
    }
    return base;
  };

  return (
    <div style={{ border: '1px solid #e9ecef', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
      <div style={{ background: '#f8f9fa', padding: '8px 10px', fontWeight: 'bold', fontSize: 18 }}>
        {format(monthDate, 'yyyy年MM月', { locale: zhCN })}
      </div>
      {/* Weekday header aligned to columns */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${DAY_CELL_WIDTH}px)`, gap: 4, padding: '6px 8px 0 8px', color: '#6c757d', fontSize: 14, justifyContent: 'center' }}>
        {['周一','周二','周三','周四','周五','周六','周日'].map((w, i) => (
          <div key={i} style={{ textAlign: 'center' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${DAY_CELL_WIDTH}px)`, gap: 4, padding: 8, justifyContent: 'center' }}>
        {days.map((d) => {
          const tags = [];
          const outMonth = !isSameMonth(d, monthDate);
          if (isHoliday(d)) tags.push('节');
          if (isMakeup(d)) tags.push('班');
          return (
            <div key={format(d, 'yyyy-MM-dd')} style={cellStyle(d)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: isSameDay(d, leaveStart) || isSameDay(d, leaveEnd) ? 'bold' : 'normal' }}>
                  {format(d, 'd')}
                </span>
                <div>
                  {tags.map((t, i) => (
                    <span key={i} style={{ fontSize: 12, marginLeft: 4, padding: '0 4px', borderRadius: 3, background: t==='节' ? '#f8d7da' : t==='班' ? '#cfe2ff' : '#d4edda', color: '#333' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Legend = () => (
  <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: '#495057', flexWrap: 'wrap' }}>
    <LegendItem color="#fdeaea" border="#f5c2c2" text="节假日"/>
    <LegendItem color="#eef5ff" border="#b6d3ff" text="工作日（上班）"/>
    <LegendItem color="#faf7f1" border="#f1e0c7" text="周末"/>
    <LegendItem outline="#28a745" text="产假区间"/>
  </div>
);

const LegendItem = ({ color, border, outline, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{ width: 14, height: 14, background: color || '#fff', border: outline ? `2px solid ${outline}` : `1px solid ${border || '#ced4da'}`, borderRadius: 3 }} />
    <span>{text}</span>
  </div>
);

export default LeaveCalendar;
