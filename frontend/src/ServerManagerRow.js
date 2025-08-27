import React from "react";
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Chip from '@material-ui/core/Chip';
import SettingsIcon from '@material-ui/icons/Settings';
import NetworkCheckIcon from '@material-ui/icons/NetworkCheck';
import BuildIcon from '@material-ui/icons/Build';
import CheckCircle from '@material-ui/icons/CheckCircle';
import ErrorCircle from '@material-ui/icons/Error';

import ServerManagerDialog from "./ServerManagerDialog";
import useAPI from './common/api';

export default function ServerManagerRow(props) {
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const api = useAPI();

  let data = props.data;

  function openMenu(event) {
    setMenuAnchor(event.currentTarget);
  }

  function closeMenu() {
    setMenuAnchor(null);
  }

  function toggleEditDialog() {
    setDialogOpen(!dialogOpen);
  }

  function editServer(data) {
    return props.onEdit(data);
  }

  function checkConnection() {
    closeMenu();
    props.onCheck(props.data);
  }

  function forceConfigSync() {
    closeMenu();
    api.forceConfigSync({ID: data.ID}).then(props.onRefresh);
  }

  function toggleMaintenance() {
    closeMenu();
    api.updateServer({ID: data.ID, active: !data.active}).then(props.onRefresh);
  }

  function renderServerType() {
    return data.managed ? <Chip icon={<SettingsIcon />} label="Managed" /> : <Chip label="Unmanaged / External" variant="outlined" />;
  }

  function renderServerStatus() {
    if( ! data.managed ) return '';
    return data.active ? <Chip icon={<NetworkCheckIcon />} label="Active" /> : <Chip icon={<BuildIcon />} label="Maintenance" variant="outlined" />;
  }

  function renderServerHealth() {
    if( ! data.managed ) return "";
    if( data.last_status === null ) return "new / unknown"
    return data.last_status ? <Chip icon={<CheckCircle />} label="Healthy" color="primary" /> : <Chip icon={<ErrorCircle />} label="Failed" color="secondary" />;
  }

  function renderConfigSync() {
    if( ! data.managed ) return "";
    return data.update_required ? <Chip icon={<ErrorCircle />} label="Sync required" color="secondary" /> : <Chip icon={<CheckCircle />} label="Up to date" color="primary" />;
  }

  return (
    <TableRow key={data.ID}>
      <TableCell>
        <IconButton aria-haspopup="true" color="primary" onClick={openMenu}>
          <MenuIcon />
        </IconButton>
        <Menu keepMounted anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
          { Boolean(data.managed) && <MenuItem disabled={props.readOnly} onClick={checkConnection}>Check SSH Health</MenuItem> }
          { Boolean(data.managed) && <MenuItem disabled={props.readOnly} onClick={forceConfigSync}>Force Config Sync</MenuItem> }
          { Boolean(data.managed) && <MenuItem disabled={props.readOnly} onClick={toggleMaintenance}>Toggle Maintenance</MenuItem> }
          <MenuItem disabled={props.readOnly} onClick={() => { toggleEditDialog(); closeMenu(); }}>Edit Server</MenuItem>
          <MenuItem disabled={props.readOnly} onClick={() => { props.onDelete(data); closeMenu(); }}>Delete Server</MenuItem>
        </Menu>
        <ServerManagerDialog open={dialogOpen} data={data} onSubmit={editServer} toggleFunc={toggleEditDialog} />
      </TableCell>
      <TableCell>{data.name}</TableCell>
      <TableCell>{data.dns_fqdn}</TableCell>
      <TableCell>{data.dns_ip}</TableCell>
      <TableCell>{renderServerType()}</TableCell>
      <TableCell>{renderServerStatus()}</TableCell>
      <TableCell>{renderServerHealth()}</TableCell>
      <TableCell>{renderConfigSync()}</TableCell>
    </TableRow>
  );
}
