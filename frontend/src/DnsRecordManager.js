import React from "react";
import { forwardRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import SettingsIcon from '@material-ui/icons/Settings';
import PhotoCamera from '@material-ui/icons/PhotoCamera';
import InvertColors from '@material-ui/icons/InvertColors';
import AcUnit from '@material-ui/icons/AcUnit';
import SyncIcon from '@material-ui/icons/Sync';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import LinearProgress from '@material-ui/core/LinearProgress';
import AddCircle from '@material-ui/icons/AddCircle';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

// Matarial-Table icons
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

import ContentHeader from "./ContentHeader";
import DnsZoneConfigDialog from "./DnsZoneConfigDialog";
import DnsZonePreviewDialog from "./DnsZonePreviewDialog";
import DnsRecordDialog from "./DnsRecordDialog";
import DnsRecordTtlDialog from "./DnsRecordTtlDialog";
import { AuthenticationContext } from "./common/AuthenticationProvider";
import { NotificationContext } from "./common/NotificationProvider";
import useAPI from "./common/api";

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

export default function DnsRecordManager(props) {
  const [addMenuAnchor, setAddMenuAnchor] = React.useState(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [addDialogType, setAddDialogType] = React.useState('a');
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editDialogData, setEditDialogData] = React.useState(null);
  const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false);
  const [ttlDialogOpen, setTtlDialogOpen] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [zoneInfo, setZoneInfo] = React.useState(null);
  const [records, setRecords] = React.useState([]);

  const notifier = React.useContext(NotificationContext);
  const session = React.useContext(AuthenticationContext);
  const canEdit = ['dnsop','dnsadmin','sysadmin'].includes(session.user.role);

  const { id } = useParams();
  const history = useHistory();
  const api = useAPI();

  function navigateToView() {
    history.push("/zones");
  }

  function openAddDialog(recordType) {
    setAddDialogType(recordType);
    setAddDialogOpen(true);
    setAddMenuAnchor(null);
  }

  function openEditDialog(event, rows) {
    // Single row edit
    if( rows.length < 2 ) {
      setEditDialogData(rows[0]);
      setEditDialogOpen(true);
    // Multi-row edit, equals TTL Update
    } else {
      setSelectedRows(rows);
      setTtlDialogOpen(true);
    }
  }

  function getRecords() {
    api.getDnsRecords(id).then(setRecords);
  }

  function getZoneInfo() {
    api.getDnsZone(id).then(setZoneInfo);
  }

  function getZoneInfoAndRecords() {
    getZoneInfo();
    getRecords();
  }

  function deleteRecords(event, rows) {
    let ids = [];
    if( rows.length ) {
      ids = rows.map(row => { return row.ID });
      api.deleteDnsRecords(ids).then(getRecords);
    }
  }

  function freezeZone() {
    api.freezeDnsZone(zoneInfo).then(getZoneInfoAndRecords);
  }

  function thawZone() {
    api.thawDnsZone(zoneInfo).then(getZoneInfo);
  }

  function syncZone() {
    setSyncDialogOpen(false);
    api.syncDnsZone(zoneInfo).then(getRecords);
  }

  function isReverseZone() {
    return /.*\.in-addr\.arpa$/.test(zoneInfo.fqdn);
  }

  function buildRecordTypesKeyList() {
    if( isReverseZone() ) return ['ptr','ns'];
    return Object.keys(notifier.appInfo.rrTypes).filter(key => key !== 'ptr').sort();
  }

  function renderEditDialog() {
    return editDialogOpen ? <DnsRecordDialog open={editDialogOpen} onRefresh={getRecords} onClose={() => { setEditDialogOpen(false); }} zoneId={id} data={editDialogData} recordType={editDialogData.type} /> : null;
  }

  function renderSettingsDialog() {
    return zoneInfo !== null ? <DnsZoneConfigDialog open={configDialogOpen} zoneId={id} readOnly={!canEdit} onRefresh={getZoneInfoAndRecords} onClose={() => { setConfigDialogOpen(false); }} /> : null;
  }

  function renderPreviewDialog() {
    return zoneInfo !== null ? <DnsZonePreviewDialog zone={zoneInfo} open={previewDialogOpen} onClose={() => { setPreviewDialogOpen(false); }} /> : null;
  }

  function renderFreezeThawButton() {
    if( zoneInfo === null || ! zoneInfo.dynamicUpdates ) return null;
    return zoneInfo.frozen ? (
      <Button variant="contained" color="secondary" startIcon={<InvertColors />} style={{marginRight: 10}} onClick={thawZone}>Thaw Zone</Button>
    ) : (
      <Button variant="contained" color="primary" startIcon={<AcUnit />} style={{marginRight: 10}} onClick={freezeZone}>Freeze Zone</Button>
    );
  }

  React.useEffect(getZoneInfoAndRecords, []);  // eslint-disable-line

  const tableColumns = [
    { title: "Name", field: "name" },
    { title: "Type", field: "type", lookup: notifier.appInfo.rrTypes},
    { title: "Data", field: "data" },
    { title: "TTL", field: "ttl", filtering: false },
  ];

  const tableActions = canEdit ? [
    { icon: forwardRef((props, ref) => <AddCircle {...props} ref={ref} />), tooltip: 'Add new records', isFreeAction: true, onClick: event => { setAddMenuAnchor(event.currentTarget); } },
    { icon: forwardRef((props, ref) => <EditIcon {...props} ref={ref} />), tooltip: 'Edit records', onClick: openEditDialog },
    { icon: forwardRef((props, ref) => <DeleteIcon {...props} ref={ref} />), tooltip: 'Delete records', onClick: deleteRecords },
  ] : [];

  const tableOptions = {
    search: false,
    filtering: true,
    exportButton: true,
    selection: canEdit,
    selectionProps: rowData => ({disabled: Boolean(rowData.protected)}),
    pageSize: 20,
    pageSizeOptions: [10, 20, 50, 100, 250],
  };

  return (
    <>
      <ContentHeader title="Manage DNS Zone">
        <Button variant="contained" color="primary" startIcon={<ArrowBackIcon />} style={{marginRight: 10}} onClick={navigateToView}>Back</Button>
        <Button variant="contained" color="primary" disabled={zoneInfo === null || ! zoneInfo.managed || zoneInfo.type !== 'authoritative'} startIcon={<PhotoCamera />} style={{marginRight: 10}} onClick={() => { setPreviewDialogOpen(true); }}>Zonefile Preview</Button>
        { renderPreviewDialog() }
        { renderFreezeThawButton() }
        <Button variant="contained" color="primary" disabled={zoneInfo === null || Boolean(zoneInfo.frozen) || ! Boolean(zoneInfo.managed) || zoneInfo.type !== 'authoritative'} startIcon={<SyncIcon />} style={{marginRight: 10}} onClick={() => { setSyncDialogOpen(true); }}>Re-Import Zone</Button>
        <SyncWarnDialog open={syncDialogOpen} onClose={() => { setSyncDialogOpen(false); }} onSubmit={syncZone} />
        <Button variant="contained" color="primary" disabled={zoneInfo === null || ! zoneInfo.managed} startIcon={<SettingsIcon />} onClick={() => { setConfigDialogOpen(true); }}>Zone Settings</Button>
        { renderSettingsDialog() }
      </ContentHeader>
      { zoneInfo === null ? <LinearProgress /> : ! Boolean(zoneInfo.managed) && zoneInfo.type === 'authoritative' ? <Box>The primary server of <b>{zoneInfo.fqdn}</b> is unmanaged, hence the records aren't available in this GUI</Box> : (
      <>
        { zoneInfo.type === 'forward' ? <Box>Zone '{zoneInfo.fqdn}' is forwarding all requests to {zoneInfo.forwarders_name} ({zoneInfo.forwarders})</Box> : (
        <>
          <MaterialTable data={records} columns={tableColumns} options={tableOptions} actions={tableActions} title={"Records in " + zoneInfo.fqdn} icons={tableIcons} />
          <Menu anchorEl={addMenuAnchor} open={Boolean(addMenuAnchor)} onClose={() => { setAddMenuAnchor(null); }}>
            { buildRecordTypesKeyList().map( key => <MenuItem key={key} onClick={() => { openAddDialog(key); }}>{notifier.appInfo.rrTypes[key]}</MenuItem> ) }
          </Menu>
          <DnsRecordDialog new open={addDialogOpen} onRefresh={getRecords} onClose={() => { setAddDialogOpen(false); }} zoneId={id} recordType={addDialogType} />
          <DnsRecordTtlDialog open={ttlDialogOpen} onRefresh={getRecords} onClose={() => { setTtlDialogOpen(false); }} records={selectedRows} />
          { renderEditDialog() }
        </>
        ) }
      </>
      ) }
    </>
  );
}

function SyncWarnDialog(props) {
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Zone Re-Import</DialogTitle>
      <DialogContent>
        <h4>Warning</h4>
        <p>This will download and import the current zone state and records from the active master (primary) server of this zone. Any pending zone chanes will be discarded!</p>
        <p>Use this only if you have implemented changes on the master servers zone file manually or if this zone allows dynamic updates</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button onClick={props.onSubmit}>Import Now</Button>
      </DialogActions>
    </Dialog>
  );
}
