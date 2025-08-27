import React, { useState, forwardRef } from "react";

import useAPI from "./common/api";

// Matarial-Table + Icons
import MaterialTable from "@material-table/core";
import AddBox from '@material-ui/icons/AddBox';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import Check from '@material-ui/icons/Check';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import Clear from '@material-ui/icons/Clear';
import DeleteOutline from '@material-ui/icons/DeleteOutline';
import Edit from '@material-ui/icons/Edit';
import FilterList from '@material-ui/icons/FilterList';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import Remove from '@material-ui/icons/Remove';
import SaveAlt from '@material-ui/icons/SaveAlt';
import Search from '@material-ui/icons/Search';
import ViewColumn from '@material-ui/icons/ViewColumn';

const tableIcons = {
  Add: forwardRef((props, ref) => <AddBox {...props} ref={ref} />),
  Check: forwardRef((props, ref) => <Check {...props} ref={ref} />),
  Clear: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Delete: forwardRef((props, ref) => <DeleteOutline {...props} ref={ref} />),
  DetailPanel: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  Edit: forwardRef((props, ref) => <Edit {...props} ref={ref} />),
  Export: forwardRef((props, ref) => <SaveAlt {...props} ref={ref} />),
  Filter: forwardRef((props, ref) => <FilterList {...props} ref={ref} />),
  FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
  LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
  NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  PreviousPage: forwardRef((props, ref) => <ChevronLeft {...props} ref={ref} />),
  ResetSearch: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Search: forwardRef((props, ref) => <Search {...props} ref={ref} />),
  SortArrow: forwardRef((props, ref) => <ArrowDownward {...props} ref={ref} />),
  ThirdStateCheck: forwardRef((props, ref) => <Remove {...props} ref={ref} />),
  ViewColumn: forwardRef((props, ref) => <ViewColumn {...props} ref={ref} />)
};

export default function Audit(props) {
  const [auditLog, setAuditLog] = useState(null);
  const api = useAPI();

  function getAuditLog() {
    api.getAuditLog().then(setAuditLog);
  }

  function renderData(row) {
    const data = JSON.parse(row.data);
    switch(row.action) {
      case '/VIEW':
      case '/USER':
        return data.name;
      case '/ZONE':
      case '/ZONE/THAW':
      case '/ZONE/FREEZE':
      case '/ZONE/SYNC':
        return data.fqdn;
      case '/ZONES/IMPORT':
        return <i>{data.zones.length} zones</i>;
      case '/RECORDS/IMPORT':
        return <i>{data.records.length} records</i>;
      default:
        return '';
    }
  }

  React.useEffect(getAuditLog, []); // eslint-disable-line

  const tableColumns = [
    { title: "Timestamp", field: "timestamp" },
    { title: "User (role)", field: "user", render: data => <span>{data.user} ({data.role})</span> },
    { title: "Method", field: "method" },
    { title: "Subject", field: "action" },
    { title: "Data", render: renderData },
  ];

  const tableOptions = {
    search: false, filtering: true, selection: false, exportButton: true, pageSize: 20, pageSizeOptions: [10, 20, 50, 100, 250]
  };

  return (
    <MaterialTable
      data={auditLog === null ? [] : auditLog}
      columns={tableColumns}
      options={tableOptions}
      title="Audit Log"
      icons={tableIcons}
    />
  );

}
