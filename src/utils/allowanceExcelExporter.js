import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportAllowanceExcel = ({
  filename,
  basicInfoData = [],
  calculationData = [],
  policyData = []
}) => {
  const allData = [...basicInfoData, ...calculationData, ...policyData];
  const safeFilename = filename || `产假津贴计算_${Date.now()}.xlsx`;

  const worksheet = XLSX.utils.aoa_to_sheet(allData);
  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 40 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '产假津贴计算');

  const workbookOutput = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([workbookOutput], { type: 'application/octet-stream' });

  saveAs(blob, safeFilename);
};
