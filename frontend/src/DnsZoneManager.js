import React, {forwardRef} from "react";
import { Link } from "react-router-dom";
import Tooltip from '@material-ui/core/Tooltip';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import AddCircle from '@material-ui/icons/AddCircle';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowForward from '@material-ui/icons/ArrowForward';
import ArrowBack from '@material-ui/icons/ArrowBack';

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

import DnsZoneDialog from "./DnsZoneDialog";
import { AuthenticationContext } from "./common/AuthenticationProvider";
import { useTranslation } from "./common/LanguageContext";
import useAPI from './common/api';

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

export default function DnsZoneManager(props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteZonePtrDialogOpen, setDeleteZonePtrDialogOpen] = React.useState(false);
  const [pendingZoneIds, setPendingZoneIds] = React.useState([]);
  const [pendingPtrRecords, setPendingPtrRecords] = React.useState([]);
  const api = useAPI();
  const session = React.useContext(AuthenticationContext);
  const { t } = useTranslation();
  const canEdit = ['dnsop','dnsadmin','sysadmin'].includes(session.user.role);

  function deleteZones(event, zones) {
    const zone_ids = zones.map( zone => zone.ID );
    api.deleteZones(zone_ids).then( result => {
      if ( result && result.code === 'ZONE_PTR_EXISTS_DELETE' ) {
        setPendingZoneIds(zone_ids);
        setPendingPtrRecords(result.ptrRecords || []);
        setDeleteZonePtrDialogOpen(true);
      } else if ( result !== false ) {
        props.onRefresh();
      }
    } );
  }

  function confirmDeleteZonesWithPtr() {
    if ( ! pendingZoneIds.length ) return;
    api.deleteZones({ id_list: pendingZoneIds, deletePtr: true }).then( result => {
      setDeleteZonePtrDialogOpen(false);
      setPendingZoneIds([]);
      setPendingPtrRecords([]);
      if ( result !== false ) props.onRefresh();
    } );
  }

  function confirmDeleteZonesOnly() {
    if ( ! pendingZoneIds.length ) return;
    api.deleteZones({ id_list: pendingZoneIds, deleteWithoutPtr: true }).then( result => {
      setDeleteZonePtrDialogOpen(false);
      setPendingZoneIds([]);
      setPendingPtrRecords([]);
      if ( result !== false ) props.onRefresh();
    } );
  }

  const tableColumns = [
    { title: t("dns.zoneFqdn"), field: "fqdn", render: rowData => <FqdnColumn id={rowData.ID} fqdn={rowData.fqdn} /> },
    { title: t("dns.network"), field: "network" },
    { title: t("dns.zoneType"), field: "type", width: 250, lookup: {authoritative: t("dns.authoritative"), forward: t("dns.forward"), stub: t("dns.stub")} },
    { title: t("dns.forwardingGroup"), field: "forwarder_group_name", width: 250 },
    { title: t("dns.nsGroupMaster"), field: "ns_group_name", render: rowData => `${rowData.ns_group_name} / ${rowData.master}` },
    { title: t("dns.comment"), field: "comment" },
  ];

  const tableActions = canEdit ? [
    { icon: forwardRef((props, ref) => <AddCircle {...props} ref={ref} />), tooltip: t('dns.newZone'), isFreeAction: true, onClick: () => { setDialogOpen(true); } },
    { icon: forwardRef((props, ref) => <DeleteIcon {...props} ref={ref} />), tooltip: t('dns.deleteZones'), onClick: deleteZones },
  ] : [];

  const tableOptions = {
    search: false, filtering: true, selection: canEdit, exportButton: true, pageSize: 20, pageSizeOptions: [10, 20, 50, 100, 250]
  };

  return (
    <>
      <MaterialTable
        data={props.zones}
        columns={tableColumns}
        options={tableOptions}
        actions={tableActions}
        title={"Zones in " + props.view.name}
        icons={tableIcons}
      />
      <DnsZoneDialog new
        open={dialogOpen}
        view={props.view.name}
        nsGroups={props.nsGroups}
        fwdGroups={props.fwdGroups}
        onClose={() => { setDialogOpen(false); }}
        onRefresh={props.onRefresh}
      />
      <Dialog open={deleteZonePtrDialogOpen} onClose={() => { setDeleteZonePtrDialogOpen(false); setPendingZoneIds([]); setPendingPtrRecords([]); }}>
        <DialogTitle>{t("dns.deleteZonePtrTitle")}</DialogTitle>
        <DialogContent>
          <p>{t("dns.deleteZonePtrMessage")}</p>
          { pendingPtrRecords.length > 0 && (
            <Box component="div" mt={2}>
              <Box component="span" fontWeight="fontWeightMedium">{t("dns.deleteZonePtrListTitle")}</Box>
              <Box component="ul" style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                { pendingPtrRecords.map((ptr, idx) => (
                  <li key={idx}>
                    <Box component="span" fontFamily="monospace">{ptr.ip}</Box>
                    {' → '}
                    <Box component="span" fontFamily="monospace">{ptr.ptrData}</Box>
                    {' '}
                    <Box component="span" color="textSecondary">({ptr.reverseZoneFqdn})</Box>
                  </li>
                )) }
              </Box>
            </Box>
          ) }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteZonePtrDialogOpen(false); setPendingZoneIds([]); setPendingPtrRecords([]); }}>{t("app.cancel")}</Button>
          <Button onClick={confirmDeleteZonesOnly}>{t("dns.deleteZonesOnly")}</Button>
          <Button color="primary" variant="contained" onClick={confirmDeleteZonesWithPtr}>{t("dns.deleteZonePtrConfirm")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function FqdnColumn({id, fqdn}) {
  return (
    <>
      { fqdn.includes('.in-addr.arpa') ? (
        <Tooltip title="Reverse Lookup Zone">
          <ArrowBack color="disabled" fontSize="small" style={{verticalAlign: "top"}} />
        </Tooltip>
      ) : (
        <Tooltip title="Forward Lookup Zone">
          <ArrowForward color="disabled" fontSize="small" style={{verticalAlign: "top"}} />
        </Tooltip>
      ) }
      <Link to={"/zone/" + id}>{fqdn}</Link>
    </>
  );
}
