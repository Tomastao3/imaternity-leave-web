import React, { useState, useEffect } from 'react';
import {
  getHolidayPlanApi,
  getHolidayYearsApi,
  addHolidayDateApi,
  removeHolidayDateApi,
  updateHolidayDateApi,
  importHolidaysApi
} from '../api/dataManagementApi';
import { readExcelFile, exportDataToExcel as exportDataToExcelGeneric, generateHolidayTemplate } from '../utils/excelUtils';
import { warmUpHolidayPlan, notifyHolidayChange } from '../utils/holidayUtils';

const HolidayManager = ({ onDataChange, onSaveAll }) => {
  const currentYear = new Date().getFullYear();
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [holidayPlan, setHolidayPlan] = useState({ holidays: [], makeupWorkdays: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [holidayNewDate, setHolidayNewDate] = useState('');
  const [holidayNewType, setHolidayNewType] = useState('holiday');
  const [holidayEditingRow, setHolidayEditingRow] = useState(null);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [newEntryData, setNewEntryData] = useState({ date: '', type: '节假日', name: '', isLegalHoliday: false });
  const [newEntryInsertAfter, setNewEntryInsertAfter] = useState(null); // 记录在哪一行后插入
  const [groupByHoliday, setGroupByHoliday] = useState(true); // 默认为分组显示
  const [expandedGroups, setExpandedGroups] = useState(new Set()); // 记录哪些分组被展开
  const [editingGroup, setEditingGroup] = useState(null); // 记录正在编辑的分组 { groupKey, name, startDate, endDate }
  const [highlightCopyButton, setHighlightCopyButton] = useState(null); // 'prev' 或 'next'，用于高亮显示复制按钮

  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    loadHolidayPlan();
  }, [selectedYear]);

  useEffect(() => {
    // 切换显示模式时清空展开状态
    setExpandedGroups(new Set());
  }, [groupByHoliday]);

  const normalizeYears = (years = []) => {
    return Array.from(new Set(years.map((year) => Number(year)).filter((year) => !Number.isNaN(year))))
      .sort((a, b) => a - b);
  };

  const ensureYearInList = (year) => {
    if (Number.isNaN(Number(year))) {
      return;
    }
    setAvailableYears((prev) => {
      const merged = normalizeYears([...prev, Number(year)]);
      return merged.length ? merged : prev;
    });
  };

  const loadYears = async () => {
    try {
      const response = await getHolidayYearsApi();
      if (response.ok) {
        const normalized = normalizeYears(response.data && response.data.length ? response.data : [currentYear]);
        const nextYears = normalized.length ? normalized : [currentYear];
        setAvailableYears(nextYears);
        if (selectedYear !== 'all' && !nextYears.includes(Number(selectedYear))) {
          const fallbackYear = nextYears[nextYears.length - 1] ?? currentYear;
          setSelectedYear(String(fallbackYear));
        }
      } else {
        setAvailableYears([currentYear]);
        if (selectedYear !== 'all' && Number(selectedYear) !== currentYear) {
          setSelectedYear(String(currentYear));
        }
      }
    } catch (error) {
      console.error('加载年份失败:', error);
      setAvailableYears([currentYear]);
      if (selectedYear !== 'all' && Number(selectedYear) !== currentYear) {
        setSelectedYear(String(currentYear));
      }
    }
  };

  const handleCopyToPrevYear = async () => {
    if (selectedYear === 'all') {
      showMessage('error', '请选择具体年份后再复制');
      return;
    }

    const currentYearNum = Number(selectedYear);
    const prevYear = currentYearNum - 1;

    if (!window.confirm(`确定要将 ${currentYearNum} 年的节假日数据复制到 ${prevYear} 年吗？`)) return;

    setIsLoading(true);
    try {
      const response = await getHolidayPlanApi({ year: currentYearNum });
      if (!response.ok) {
        showMessage('error', '获取当前年份数据失败');
        return;
      }

      const currentPlan = response.data;
      
      // 提取日期和名称的辅助函数
      const extractDateInfo = (item) => {
        if (typeof item === 'string') {
          return { date: item, name: '', isLegalHoliday: false };
        }
        return {
          date: item?.date || '',
          name: item?.name || '',
          isLegalHoliday: item?.isLegalHoliday === true
        };
      };
      
      const prevYearPlan = {
        holidays: (currentPlan.holidays || []).map(item => {
          const { date, name, isLegalHoliday } = extractDateInfo(item);
          const d = new Date(date);
          d.setFullYear(prevYear);
          return { date: d.toISOString().split('T')[0], name, isLegalHoliday };
        }),
        makeupWorkdays: (currentPlan.makeupWorkdays || []).map(item => {
          const { date, name, isLegalHoliday } = extractDateInfo(item);
          const d = new Date(date);
          d.setFullYear(prevYear);
          return { date: d.toISOString().split('T')[0], name, isLegalHoliday };
        })
      };

      const holidays = [
        ...prevYearPlan.holidays.map(item => ({
          year: prevYear,
          date: item.date,
          type: 'holiday',
          name: item.name,
          isLegalHoliday: item.isLegalHoliday === true
        })),
        ...prevYearPlan.makeupWorkdays.map(item => ({
          year: prevYear,
          date: item.date,
          type: 'makeup',
          name: item.name,
          isLegalHoliday: item.isLegalHoliday === true
        }))
      ];

      const importResponse = await importHolidaysApi({ holidays });
      if (importResponse.ok) {
        await loadYears();
        ensureYearInList(prevYear);
        setSelectedYear(String(prevYear));
        // 复制成功后，如果当前高亮的是"复制到上一年"，则清除高亮
        if (highlightCopyButton === 'prev') {
          setHighlightCopyButton(null);
        }
        await warmUpHolidayPlan(prevYear);
        if (onDataChange) onDataChange('holidays', { years: [prevYear, currentYearNum] });
      } else {
        showMessage('error', importResponse.error);
      }
    } catch (error) {
      showMessage('error', `复制失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHolidayPlan = async () => {
    setIsLoading(true);
    try {
      const response = await getHolidayPlanApi({ year: selectedYear });
      if (response.ok) {
        if (selectedYear === 'all' && response.data.years) {
          setAvailableYears(response.data.years.length ? response.data.years : [currentYear]);
        }
        setHolidayPlan(response.data);
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `加载失败: ${error.message}`);
    } finally {
      setIsLoading(false);
      setHolidayEditingRow(null);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAddHoliday = async () => {
    if (!holidayNewDate) {
      showMessage('error', '请输入日期');
      return;
    }

    const parsedDate = new Date(holidayNewDate);
    if (Number.isNaN(parsedDate.getTime())) {
      showMessage('error', '请输入有效的日期');
      return;
    }

    const year = selectedYear === 'all' ? parsedDate.getFullYear() : Number(selectedYear);
    
    setIsLoading(true);
    try {
      const response = await addHolidayDateApi({
        year,
        date: holidayNewDate,
        type: holidayNewType === 'holiday' ? 'holiday' : 'makeup'
      });
      
      if (response.ok) {
        await loadHolidayPlan();
        await loadYears();
        setHolidayNewDate('');
        await warmUpHolidayPlan(year);
        notifyHolidayChange({ years: [year], source: 'add-date' });
        if (onDataChange) onDataChange('holidays', { years: [year] });
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `添加失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDate = async (date) => {
    if (!window.confirm(`确定要删除日期 ${date} 吗？`)) return;

    const year = selectedYear === 'all' ? new Date(date).getFullYear() : Number(selectedYear);
    
    setIsLoading(true);
    try {
      const response = await removeHolidayDateApi({ year, date });
      if (response.ok) {
        await loadHolidayPlan();
        await warmUpHolidayPlan(year);
        notifyHolidayChange({ years: [year], source: 'remove-date' });
        if (onDataChange) onDataChange('holidays', { years: [year] });
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `删除失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRow = (date, type, name, isLegalHoliday = false) => {
    setHolidayEditingRow({
      originalDate: date,
      date: date,
      type: type === 'holiday' ? '节假日' : '工作日',
      name: name || '',
      isLegalHoliday: isLegalHoliday || false
    });
  };

  const handleCopyRow = (date, type, name, isLegalHoliday = false) => {
    // Show the new entry form with pre-filled data, insert after current row
    setNewEntryData({
      date: date,
      type: type === 'holiday' ? '节假日' : '工作日',
      name: name || '',
      isLegalHoliday: isLegalHoliday || false
    });
    setNewEntryInsertAfter(date); // 记录在这个日期后插入
    setShowNewEntryForm(true);
  };

  const handleSaveNewEntry = async () => {
    const { date, type, name, isLegalHoliday } = newEntryData;

    if (!date) {
      showMessage('error', '日期不能为空');
      return;
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      showMessage('error', '请输入有效的日期');
      return;
    }

    const newYear = parsedDate.getFullYear();
    const activeYear = selectedYear === 'all' ? null : Number(selectedYear);

    if (selectedYear !== 'all' && newYear !== activeYear) {
      showMessage('error', `仅可添加 ${selectedYear} 年的日期，请重新选择`);
      return;
    }

    // Check for duplicate dates
    const isDuplicate = allDates.some(item => item.date === date);
    if (isDuplicate) {
      alert(`日期 ${date} 已存在`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await addHolidayDateApi({
        year: newYear,
        date: date,
        type: type === '工作日' ? 'makeup' : 'holiday',
        name: name || '',
        isLegalHoliday: isLegalHoliday || false
      });

      if (response.ok) {
        await loadHolidayPlan();
        await loadYears();
        setShowNewEntryForm(false);
        setNewEntryData({ date: '', type: '节假日', name: '', isLegalHoliday: false });
        setNewEntryInsertAfter(null);
        await warmUpHolidayPlan(newYear);
        notifyHolidayChange({ years: [newYear], source: 'add-range' });
        if (onDataChange) onDataChange('holidays', { years: [newYear] });
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `新增失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelNewEntry = () => {
    setShowNewEntryForm(false);
    setNewEntryData({ date: '', type: '节假日', name: '', isLegalHoliday: false });
    setNewEntryInsertAfter(null);
  };

  const handleEditSave = async () => {
    if (!holidayEditingRow) return;
    const { originalDate, date, type, name, isLegalHoliday } = holidayEditingRow;

    if (!date) {
      showMessage('error', '日期不能为空');
      return;
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      showMessage('error', '请输入有效的日期');
      return;
    }

    const newYear = parsedDate.getFullYear();
    const activeYear = selectedYear === 'all' ? null : Number(selectedYear);

    if (selectedYear !== 'all' && newYear !== activeYear) {
      showMessage('error', `仅可编辑 ${selectedYear} 年的日期，请重新选择`);
      return;
    }

    // Check for duplicate dates (only if date has changed)
    if (originalDate !== date) {
      const isDuplicate = allDates.some(item => item.date === date);
      if (isDuplicate) {
        alert(`日期 ${date} 已存在`);
        return;
      }
    }

    setIsLoading(true);
    try {
      // This is an edit operation
      const originalYear = new Date(originalDate).getFullYear();
      const sourceYear = selectedYear === 'all' ? originalYear : activeYear;
      const targetYear = selectedYear === 'all' ? newYear : activeYear;

      const response = await updateHolidayDateApi({
        sourceYear,
        originalDate,
        targetYear,
        newDate: date,
        type: type === '工作日' ? 'makeup' : 'holiday',
        name: name || '',
        isLegalHoliday: isLegalHoliday || false
      });

      if (response.ok) {
        await loadHolidayPlan();
        setHolidayEditingRow(null);
        await warmUpHolidayPlan(targetYear);
        notifyHolidayChange({ years: [sourceYear, targetYear], source: 'edit-date' });
        if (onDataChange) onDataChange('holidays', { years: [sourceYear, targetYear] });
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `保存失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCancel = () => {
    setHolidayEditingRow(null);
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await readExcelFile(file, 'holiday');
      
      // Validate data
      const rowErrors = [];
      (data || []).forEach((r, idx) => {
        if (!r || !r.date || typeof r.date !== 'string' || r.date.trim() === '') {
          rowErrors.push({ row: idx + 2, errors: ['日期不能为空或格式无效(示例: 2025-10-07)'] });
        }
        const t = (r && r.type) ? String(r.type).trim() : '';
        if (!['节假日', '工作日'].includes(t)) {
          rowErrors.push({ row: idx + 2, errors: ['类型必须为"节假日"或"工作日"'] });
        }
      });
      
      if (rowErrors.length > 0) {
        const firstFew = rowErrors.slice(0, 5).map(e => `第${e.row}行: ${e.errors.join('; ')}`).join(' | ');
        showMessage('error', `导入失败：存在 ${rowErrors.length} 行格式错误。示例：${firstFew}${rowErrors.length > 5 ? ' ...' : ''}`);
        return;
      }

      const response = await importHolidaysApi({ holidays: data });
      if (response.ok) {
        await loadHolidayPlan();
        await loadYears();
        const importYears = Array.from(new Set((data || []).map(item => {
          const dateStr = item?.date;
          if (!dateStr) return null;
          const year = Number(String(dateStr).slice(0, 4));
          return Number.isFinite(year) ? year : null;
        }).filter(Boolean)));
        if (importYears.length > 0) {
          await Promise.all(importYears.map(warmUpHolidayPlan));
        }
        notifyHolidayChange({ years: importYears.length ? importYears : undefined, source: 'import' });
        if (onDataChange) onDataChange('holidays', { years: importYears.length ? importYears : undefined });
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `导入失败: ${error.message}`);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const handleExport = () => {
    const filename = `节假日_${selectedYear}.xlsx`;
    exportDataToExcelGeneric(holidayPlan, 'holiday', filename);
  };

  const handleDownloadTemplate = () => {
    generateHolidayTemplate();
  };

  const handleNavigateYear = (offset) => {
    const baseYear = selectedYear === 'all' ? currentYear : Number(selectedYear);
    if (Number.isNaN(baseYear)) {
      return;
    }
    const newYear = baseYear + offset;
    
    // 检查目标年份是否在可用年份列表中
    const yearExists = availableYears.includes(newYear);
    
    if (!yearExists) {
      // 如果目标年份不存在，弹出提示框并高亮对应的复制按钮
      const direction = offset > 0 ? '下一年' : '上一年';
      alert(`没有 ${newYear} 年的数据，建议复制数据到该年份`);
      setHighlightCopyButton(offset > 0 ? 'next' : 'prev');
    } else {
      // 如果目标年份存在，正常切换并清除高亮
      setSelectedYear(String(newYear));
      setHighlightCopyButton(null);
    }
  };

  // 开始编辑分组
  const handleEditGroup = (group) => {
    setEditingGroup({
      groupKey: group.groupKey,
      name: group.name || '',
      startDate: group.startDate,
      endDate: group.endDate,
      type: group.type,
      originalDates: group.dates,
      items: group.items || [] // 保存完整的items数组
    });
  };

  // 取消编辑分组
  const handleCancelGroupEdit = () => {
    setEditingGroup(null);
  };

  // 保存分组编辑
  const handleSaveGroupEdit = async () => {
    if (!editingGroup) return;

    const { name, startDate, endDate, type, originalDates, items } = editingGroup;

    if (!startDate || !endDate) {
      showMessage('error', '请选择开始日期和结束日期');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      showMessage('error', '开始日期不能晚于结束日期');
      return;
    }

    setIsLoading(true);
    try {
      const year = selectedYear === 'all' ? start.getFullYear() : Number(selectedYear);

      // 1. 删除原有的所有日期
      for (const date of originalDates) {
        await removeHolidayDateApi({ year, date });
      }

      // 2. 生成新的日期范围
      const newDates = [];
      const current = new Date(start);
      while (current <= end) {
        newDates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // 3. 添加新的日期，保留原有的 isLegalHoliday 值
      for (let i = 0; i < newDates.length; i++) {
        const date = newDates[i];
        // 尝试从原始items中获取对应日期的isLegalHoliday值
        const originalItem = items && items.find(item => item.date === date);
        const isLegalHoliday = originalItem ? originalItem.isLegalHoliday : false;
        
        await addHolidayDateApi({
          year,
          date,
          type: type === 'holiday' ? 'holiday' : 'makeup',
          name: name || '',
          isLegalHoliday
        });
      }

      // 4. 刷新数据
      await loadHolidayPlan();
      await loadYears();
      setEditingGroup(null);
      showMessage('success', `成功更新 ${newDates.length} 条数据`);
      const affectedYears = Array.from(
        new Set(
          [selectedYear, ...newDates.map((date) => date.slice(0, 4))]
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
        )
      );
      await Promise.all(affectedYears.map(warmUpHolidayPlan));
      notifyHolidayChange({ years: affectedYears, source: 'group-edit' });
      if (onDataChange) onDataChange('holidays', { years: affectedYears });
    } catch (error) {
      showMessage('error', `保存失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToNextYear = async () => {
    if (selectedYear === 'all') {
      showMessage('error', '请选择具体年份后再复制');
      return;
    }

    const currentYearNum = Number(selectedYear);
    const nextYear = currentYearNum + 1;

    if (!window.confirm(`确定要将 ${currentYearNum} 年的节假日数据复制到 ${nextYear} 年吗？`)) return;

    setIsLoading(true);
    try {
      // Get current year plan
      const response = await getHolidayPlanApi({ year: currentYearNum });
      if (!response.ok) {
        showMessage('error', '获取当前年份数据失败');
        return;
      }

      const currentPlan = response.data;
      
      // 提取日期和名称的辅助函数
      const extractDateInfo = (item) => {
        if (typeof item === 'string') {
          return { date: item, name: '', isLegalHoliday: false };
        }
        return {
          date: item?.date || '',
          name: item?.name || '',
          isLegalHoliday: item?.isLegalHoliday === true
        };
      };
      
      const nextYearPlan = {
        holidays: (currentPlan.holidays || []).map(item => {
          const { date, name, isLegalHoliday } = extractDateInfo(item);
          const d = new Date(date);
          d.setFullYear(nextYear);
          return { date: d.toISOString().split('T')[0], name, isLegalHoliday: isLegalHoliday === true };
        }),
        makeupWorkdays: (currentPlan.makeupWorkdays || []).map(item => {
          const { date, name, isLegalHoliday } = extractDateInfo(item);
          const d = new Date(date);
          d.setFullYear(nextYear);
          return { date: d.toISOString().split('T')[0], name, isLegalHoliday: isLegalHoliday === true };
        })
      };

      const holidays = [
        ...nextYearPlan.holidays.map(item => ({
          year: nextYear,
          date: item.date,
          type: 'holiday',
          name: item.name,
          isLegalHoliday: item.isLegalHoliday
        })),
        ...nextYearPlan.makeupWorkdays.map(item => ({
          year: nextYear,
          date: item.date,
          type: 'makeup',
          name: item.name,
          isLegalHoliday: item.isLegalHoliday
        }))
      ];

      const importResponse = await importHolidaysApi({ holidays });
      if (importResponse.ok) {
        await loadYears();
        ensureYearInList(nextYear);
        setSelectedYear(String(nextYear));
        // 复制成功后，如果当前高亮的是"复制到下一年"，则清除高亮
        if (highlightCopyButton === 'next') {
          setHighlightCopyButton(null);
        }
        await warmUpHolidayPlan(nextYear);
        notifyHolidayChange({ years: [nextYear, currentYearNum], source: 'copy-next' });
        if (onDataChange) onDataChange('holidays', { years: [nextYear, currentYearNum] });
      } else {
        showMessage('error', importResponse.error);
      }
    } catch (error) {
      showMessage('error', `复制失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Combine holidays and makeup workdays for display
  const extractDateInfo = (item) => {
    if (typeof item === 'string') {
      return { date: item, name: '' };
    }
    return { date: item.date || '', name: item.name || '' };
  };
  
  const allDates = [
    ...(holidayPlan.holidays || []).map(item => {
      const { date, name } = extractDateInfo(item);
      // 确保 isLegalHoliday 是布尔值
      const isLegalHoliday = item.isLegalHoliday === true || item.isLegalHoliday === 'true';
      return { date, name, type: 'holiday', typeName: '节假日', isLegalHoliday };
    }),
    ...(holidayPlan.makeupWorkdays || []).map(item => {
      const { date, name } = extractDateInfo(item);
      // 确保 isLegalHoliday 是布尔值
      const isLegalHoliday = item.isLegalHoliday === true || item.isLegalHoliday === 'true';
      return { date, name, type: 'makeup', typeName: '工作日', isLegalHoliday };
    })
  ].sort((a, b) => a.date.localeCompare(b.date));

  // 合并连续的相同节日为一条记录
  const groupConsecutiveDates = (dates) => {
    if (!dates || dates.length === 0) return [];
    
    const groups = [];
    let currentGroup = null;
    
    dates.forEach((item, index) => {
      const currentDate = new Date(item.date);
      
      if (!currentGroup) {
        // 开始新分组
        currentGroup = {
          startDate: item.date,
          endDate: item.date,
          name: item.name,
          type: item.type,
          typeName: item.typeName,
          dates: [item.date], // 保存所有日期用于展开
          isGroup: false,
          isLegalHoliday: item.isLegalHoliday,
          items: [item] // 保存完整的item对象
        };
      } else {
        const prevDate = new Date(currentGroup.endDate);
        const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
        
        // 判断是否可以合并：日期连续且节日名称相同且类型相同
        if (dayDiff === 1 && 
            item.name === currentGroup.name && 
            item.type === currentGroup.type &&
            item.name !== '') { // 只合并有名称的节日
          // 合并到当前分组
          currentGroup.endDate = item.date;
          currentGroup.dates.push(item.date);
          currentGroup.items.push(item);
          currentGroup.isGroup = true;
        } else {
          // 保存当前分组，开始新分组
          groups.push(currentGroup);
          currentGroup = {
            startDate: item.date,
            endDate: item.date,
            name: item.name,
            type: item.type,
            typeName: item.typeName,
            dates: [item.date],
            isGroup: false,
            isLegalHoliday: item.isLegalHoliday,
            items: [item]
          };
        }
      }
      
      // 最后一项
      if (index === dates.length - 1) {
        groups.push(currentGroup);
      }
    });
    
    return groups;
  };

  // 根据显示模式选择数据
  const displayDates = groupByHoliday ? groupConsecutiveDates(allDates) : allDates.map(item => ({
    ...item,
    startDate: item.date,
    endDate: item.date,
    dates: [item.date],
    isGroup: false
  }));

  // 切换分组展开/折叠
  const toggleGroupExpand = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // 将分组展开为单独的行
  const expandDisplayDates = (dates) => {
    const result = [];
    dates.forEach((group) => {
      const groupKey = `${group.startDate}-${group.endDate}-${group.name}`;
      
      if (group.isGroup) {
        // 始终显示分组行
        result.push({ 
          ...group, 
          groupKey, 
          isGroupRow: true,
          isExpanded: expandedGroups.has(groupKey)
        });
        
        // 如果展开，显示子项
        if (expandedGroups.has(groupKey)) {
          group.dates.forEach((date, idx) => {
            // 从保存的items中获取对应的完整item
            const itemData = group.items && group.items[idx] ? group.items[idx] : {};
            result.push({
              date,
              startDate: date,
              endDate: date,
              name: group.name,
              type: group.type,
              typeName: group.typeName,
              dates: [date],
              isGroup: false,
              isGroupRow: false,
              isChildRow: true,
              parentGroupKey: groupKey,
              isLegalHoliday: itemData.isLegalHoliday || false
            });
          });
        }
      } else {
        // 非分组项直接显示
        result.push({
          date: group.startDate,
          startDate: group.startDate,
          endDate: group.endDate,
          name: group.name,
          type: group.type,
          typeName: group.typeName,
          dates: group.dates,
          isGroup: false,
          isGroupRow: false,
          isChildRow: false,
          isLegalHoliday: group.isLegalHoliday || false
        });
      }
    });
    return result;
  };

  const finalDisplayDates = expandDisplayDates(displayDates);

  return (
    <div className="manager-section">
      {/* Message Display */}
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 工具栏 */}
      <div className="toolbar">
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedYear !== 'all' && (
            <>
              <button 
                onClick={handleCopyToPrevYear} 
                className={highlightCopyButton === 'prev' ? 'btn-primary' : 'btn-secondary'} 
                style={{ fontSize: '14px' }}
              >
                📋 复制到上一年
              </button>
              <button 
                onClick={handleCopyToNextYear} 
                className={highlightCopyButton === 'next' ? 'btn-primary' : 'btn-secondary'} 
                style={{ fontSize: '14px' }}
              >
                📋 复制到下一年
              </button>
            </>
          )}
          <button onClick={() => handleNavigateYear(-1)} className="btn-secondary">
            ◀ 上一年
          </button>
          <button onClick={() => handleNavigateYear(1)} className="btn-secondary">
            下一年 ▶
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            筛选年份：
            <select
              value={selectedYear}
              onChange={(e) => {
                const newYear = e.target.value;
                setSelectedYear(newYear);
                // 手动切换年份时，检查是否应该清除高亮
                if (newYear !== 'all') {
                  const yearNum = Number(newYear);
                  // 如果切换到的年份是之前缺失的上一年或下一年，清除对应的高亮
                  if (highlightCopyButton === 'prev' && availableYears.includes(yearNum - 1)) {
                    setHighlightCopyButton(null);
                  } else if (highlightCopyButton === 'next' && availableYears.includes(yearNum + 1)) {
                    setHighlightCopyButton(null);
                  }
                }
              }}
              className="year-select"
            >
              <option value="all">全部年份</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
        
        <div className="toolbar-right">
          <button onClick={handleDownloadTemplate} className="btn-secondary">
            📥 下载模板
          </button>
          
          <label className="btn-secondary file-input-label">
            📤 导入数据
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </label>
          
          <button onClick={handleExport} className="btn-secondary">
            📊 导出数据
          </button>

        </div>
      </div>

      {/* Data Table */}
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>节日</th>
              <th>日期</th>
              <th>类型</th>
              <th>是否为法定假日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {finalDisplayDates.map((item, index) => (
              <React.Fragment key={index}>
              <tr 
                style={
                  item.isGroupRow ? { cursor: 'pointer' } : 
                  item.isChildRow ? { backgroundColor: '#f9f9f9' } : {}
                }
                onClick={item.isGroupRow && !editingGroup ? () => toggleGroupExpand(item.groupKey) : undefined}
              >
                <td onClick={(e) => item.isGroupRow && editingGroup?.groupKey === item.groupKey ? e.stopPropagation() : null}>
                  {item.isGroupRow ? (
                    editingGroup?.groupKey === item.groupKey ? (
                      <input
                        type="text"
                        value={editingGroup.name}
                        onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                        placeholder="节日名称"
                        style={{ width: '100%' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      item.name || ''
                    )
                  ) : holidayEditingRow && holidayEditingRow.originalDate === item.date ? (
                    <input
                      type="text"
                      value={holidayEditingRow.name}
                      onChange={(e) => setHolidayEditingRow({ ...holidayEditingRow, name: e.target.value })}
                      placeholder="节日名称"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    item.name || ''
                  )}
                </td>
                <td onClick={(e) => item.isGroupRow && editingGroup?.groupKey === item.groupKey ? e.stopPropagation() : null}>
                  {item.isGroupRow ? (
                    editingGroup?.groupKey === item.groupKey ? (
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <input
                          type="date"
                          value={editingGroup.startDate}
                          onChange={(e) => setEditingGroup({ ...editingGroup, startDate: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>~</span>
                        <input
                          type="date"
                          value={editingGroup.endDate}
                          onChange={(e) => setEditingGroup({ ...editingGroup, endDate: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <span>
                        {item.startDate} ~ {item.endDate} ({item.dates.length}天)
                      </span>
                    )
                  ) : item.isChildRow ? (
                    <span style={{ paddingLeft: '30px', display: 'block' }}>
                      {holidayEditingRow && holidayEditingRow.originalDate === item.date ? (
                        <input
                          type="date"
                          value={holidayEditingRow.date}
                          onChange={(e) => setHolidayEditingRow({ ...holidayEditingRow, date: e.target.value })}
                        />
                      ) : (
                        item.date
                      )}
                    </span>
                  ) : holidayEditingRow && holidayEditingRow.originalDate === item.date ? (
                    <input
                      type="date"
                      value={holidayEditingRow.date}
                      onChange={(e) => setHolidayEditingRow({ ...holidayEditingRow, date: e.target.value })}
                    />
                  ) : (
                    item.date
                  )}
                </td>
                <td>
                  {item.isGroupRow ? (
                    item.typeName
                  ) : holidayEditingRow && holidayEditingRow.originalDate === item.date ? (
                    <select
                      value={holidayEditingRow.type}
                      onChange={(e) => setHolidayEditingRow({ ...holidayEditingRow, type: e.target.value })}
                    >
                      <option value="节假日">节假日</option>
                      <option value="工作日">工作日</option>
                    </select>
                  ) : (
                    item.typeName
                  )}
                </td>
                <td>
                  {item.isGroupRow ? (
                    '-'
                  ) : holidayEditingRow && holidayEditingRow.originalDate === item.date ? (
                    <select
                      value={holidayEditingRow.isLegalHoliday ? '是' : '否'}
                      onChange={(e) => setHolidayEditingRow({ ...holidayEditingRow, isLegalHoliday: e.target.value === '是' })}
                    >
                      <option value="是">是</option>
                      <option value="否">否</option>
                    </select>
                  ) : (
                    item.isLegalHoliday ? '是' : '否'
                  )}
                </td>
                <td 
                  onClick={(e) => item.isGroupRow ? e.stopPropagation() : null}
                  style={item.isGroupRow ? { position: 'relative' } : undefined}
                >
                  {item.isGroupRow ? (
                    editingGroup?.groupKey === item.groupKey ? (
                      <div className="inline-actions">
                        <button 
                          className="btn-primary" 
                          onClick={(e) => { e.stopPropagation(); handleSaveGroupEdit(); }}
                          style={{ padding: '5px 10px', fontSize: '14px' }}
                        >
                          保存
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={(e) => { e.stopPropagation(); handleCancelGroupEdit(); }}
                          style={{ padding: '5px 10px', fontSize: '14px' }}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="inline-actions">
                        <button 
                          className="btn-edit" 
                          onClick={(e) => { e.stopPropagation(); handleEditGroup(item); }}
                          style={{ padding: '5px 10px', fontSize: '14px' }}
                        >
                          编辑
                        </button>
                      </div>
                    )
                  ) : holidayEditingRow && holidayEditingRow.originalDate === item.date ? (
                    <div className="inline-actions">
                      <button className="btn-primary" onClick={handleEditSave}>保存</button>
                      <button className="btn-secondary" onClick={handleEditCancel}>取消</button>
                    </div>
                  ) : (
                    <div className="inline-actions">
                      <button 
                        onClick={() => handleEditRow(item.date, item.type, item.name, item.isLegalHoliday)} 
                        className="btn-edit"
                        disabled={showNewEntryForm}
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleCopyRow(item.date, item.type, item.name, item.isLegalHoliday)} 
                        className="btn-primary"
                        style={{ padding: '5px 10px', fontSize: '14px' }}
                        disabled={showNewEntryForm}
                      >
                        新增
                      </button>
                      <button 
                        onClick={() => handleRemoveDate(item.date)} 
                        className="btn-delete"
                        disabled={showNewEntryForm}
                      >
                        删除
                      </button>
                    </div>
                  )}
                  {item.isGroupRow && (
                    <span
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', opacity: 1.0, userSelect: 'none', cursor: 'pointer', fontSize: '16px' }}
                      title={item.isExpanded ? '点击收起' : '点击展开'}
                      role="button"
                      aria-label={item.isExpanded ? '收起分组' : '展开分组'}
                      onClick={(e) => { e.stopPropagation(); toggleGroupExpand(item.groupKey); }}
                    >
                      {item.isExpanded ? '🔽' : '▶️'}
                    </span>
                  )}
                </td>
              </tr>
              {/* Show new entry form after this row if it matches */}
              {showNewEntryForm && newEntryInsertAfter === item.date && (
                <tr style={{ backgroundColor: '#e8f5e9' }}>
                  <td>
                    <input
                      type="text"
                      value={newEntryData.name}
                      onChange={(e) => setNewEntryData({ ...newEntryData, name: e.target.value })}
                      placeholder="节日名称"
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={newEntryData.date}
                      onChange={(e) => setNewEntryData({ ...newEntryData, date: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      value={newEntryData.type}
                      onChange={(e) => setNewEntryData({ ...newEntryData, type: e.target.value })}
                    >
                      <option value="节假日">节假日</option>
                      <option value="工作日">工作日</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={newEntryData.isLegalHoliday ? '是' : '否'}
                      onChange={(e) => setNewEntryData({ ...newEntryData, isLegalHoliday: e.target.value === '是' })}
                    >
                      <option value="是">是</option>
                      <option value="否">否</option>
                    </select>
                  </td>
                  <td>
                    <div className="inline-actions">
                      <button className="btn-primary" onClick={handleSaveNewEntry}>保存</button>
                      <button className="btn-secondary" onClick={handleCancelNewEntry}>取消</button>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {allDates.length === 0 && (
          <div className="empty-state">
            <p>暂无数据</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="stats-section">
        <div className="stats-card">
          <h4>统计信息</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">节假日</span>
              <span className="stat-value">{(holidayPlan.holidays || []).length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">调休工作日</span>
              <span className="stat-value">{(holidayPlan.makeupWorkdays || []).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>处理中...</span>
        </div>
      )}
    </div>
  );
};

export default HolidayManager;
