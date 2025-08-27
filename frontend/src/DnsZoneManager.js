import React, {forwardRef} from "react";
import { Link } from "react-router-dom";
import Tooltip from '@material-ui/core/Tooltip';
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
  const api = useAPI();
  const session = React.useContext(AuthenticationContext);
  const canEdit = ['dnsop','dnsadmin','sysadmin'].includes(session.user.role);

  function deleteZones(event, zones) {
    const zone_ids = zones.map( zone => zone.ID );
    api.deleteZones(zone_ids).then(props.onRefresh);
  }

  const tableColumns = [
    { title: "Zone FQDN", field: "fqdn", render: rowData => <FqdnColumn id={rowData.ID} fqdn={rowData.fqdn} /> },
    { title: "Network", field: "network" },
    { title: "Zone Type", field: "type", width: 250, lookup: {authoritative: "Authoritative Zone", forward: "Forward Zone", stub: "Stub Zone"} },
    { title: "Forwarding Group", field: "forwarder_group_name", width: 250 },
    { title: "NS Group / Master", field: "ns_group_name", render: rowData => `${rowData.ns_group_name} / ${rowData.master}` },
    { title: "Comment", field: "comment" },
  ];

  const tableActions = canEdit ? [
    { icon: forwardRef((props, ref) => <AddCircle {...props} ref={ref} />), tooltip: 'New Zone', isFreeAction: true, onClick: () => { setDialogOpen(true); } },
    { icon: forwardRef((props, ref) => <DeleteIcon {...props} ref={ref} />), tooltip: 'Delete Zones', onClick: deleteZones },
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
