import React from "react";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Collapse from '@material-ui/core/Collapse';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import MenuIcon from '@material-ui/icons/Menu';
import LinearProgress from '@material-ui/core/LinearProgress';
import AddCircle from '@material-ui/icons/AddCircle';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import Button from '@material-ui/core/Button';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';

import NsGroupDialog from './NsGroupDialog';

function NsGroupMemberRow(props) {
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const [sourceMenuAnchor, setSourceMenuAnchor] = React.useState(null);

  function setSource(id) {
    let newData = Object.assign({}, props.data);
    newData.source_id = id;
    props.onSetSource(newData);
    setSourceMenuAnchor(null);
  }

  function getAvailableSources() {
    return props.members.filter( member => {
      return ! ( Boolean(member.primary) || props.data.server_id === member.server_id || props.data.source_id === member.server_id );
    } );
  }

  function getType() {
    let text = props.data.hidden ? 'Hidden ' : '';
    text += props.data.primary ? 'Primary' : 'Secondary'
    text += props.data.managed ? '' : ' (unmanaged)';
    return text;
  }

  return (
    <TableRow>
      <TableCell component="th" scope="row">
        <IconButton aria-haspopup="true" color="secondary" disabled={props.readOnly} onClick={e => { setMenuAnchor(e.currentTarget); }} >
          <MenuIcon />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); }}>
          { ! Boolean(props.data.primary) &&
            <MenuItem onClick={() => { props.onSetPrimary(props.data); setMenuAnchor(null); }}>
              Set Primary
            </MenuItem>
          }
          <MenuItem onClick={() => { props.onToggleHidden(props.data); setMenuAnchor(null); }}>
            {props.data.hidden ? "Unset Hidden" : "Set Hidden"}
          </MenuItem>
          <MenuItem onClick={() => { props.onRemove(props.data); setMenuAnchor(null); }}>
            Remove From Group
          </MenuItem>
        </Menu>
      </TableCell>
      <TableCell>{props.data.name}</TableCell>
      <TableCell>{props.data.dns_ip}</TableCell>
      <TableCell>{getType()}</TableCell>
      <TableCell>
        { props.data.primary || props.members.length < 3 ? <>Primary (default)</> : (
          <>
            { props.data.source_id === null ? 'Primary (default)' : props.data.source_name }
            <IconButton aria-haspopup="true" color="secondary" disabled={props.readOnly} children={<EditIcon />} onClick={e => { setSourceMenuAnchor(e.currentTarget); }} />
            <Menu anchorEl={sourceMenuAnchor} open={Boolean(sourceMenuAnchor)} onClose={() => { setSourceMenuAnchor(null); }}>
              { getAvailableSources().map( (server, index) => <MenuItem key={index} onClick={() => { setSource(server.server_id); }}>{server.name}</MenuItem> ) }
              { props.data.source_id !== null &&
                <MenuItem onClick={() => { setSource(null); }}>Primary (default)</MenuItem>
              }
            </Menu>
          </>
        ) }
      </TableCell>
    </TableRow>
  );

}

// *****
// ToDo: Rewrite to function component
// *****

export default class NsGroupRow extends React.Component {

  state = {
    members: null,
    availableServers: [],
    expanded: false,
    renaming: false,
    isBusy: false,
    addMenuAnchor: null,
    renameDialogData: {
      ID: this.props.data.ID,
      name: this.props.data.name
    }
  }

  // Rename Dialog
  toggleRenameDialog = () => {
    this.setState(prevState => ({renaming: !prevState.renaming}));
  }
  handleDialogInput = event => {
    this.setState({renameDialogData: {ID: this.props.data.ID, name: event.currentTarget.value}});
  }
  renameGroup = () => {
    this.setState({isBusy: true});
    this.props.api.updateNsGroup(this.state.renameDialogData).then( () => {
      this.setState({isBusy: false});
      this.props.onUpdate();
    } );
  }

  // Member row collapse and data loading
  toggleCollapse = () => {
    this.setState(prevState => ({expanded: !prevState.expanded}));
    this.state.members === null && this.updateMembers();
  }
  updateMembers = () => {
    this.setState({members: null});
    this.props.api.getNsGroupMembers(this.props.data.ID).then( members => {
      this.props.api.getAvailableServers().then( availableServers => {
        this.setState({members: members, availableServers: availableServers});
      } );
    } );
  }

  // Members functions
  addMember = server_id => {
    let dataObject = {group_id: this.props.data.ID, server_id: server_id};
    this.props.api.addNsGroupMember(dataObject).then(this.updateMembers);
  }
  setPrimary = member => {
    this.props.api.setNsGroupPrimary(member).then(this.updateMembers);
  }
  setSource = member => {
    this.props.api.updateNsGroupMember(member).then(this.updateMembers);
  }
  toggleHiddenMember = member => {
    member.hidden = !Boolean(member.hidden);
    this.props.api.updateNsGroupMember(member).then(this.updateMembers);
  }
  removeMember = member => {
    this.props.api.deleteNsGroupMember(member).then(this.updateMembers);
  }
  setAddMenuAnchor = el => {
    this.setState({addMenuAnchor: el});
  }

  render() {
    return (
      <>
        <TableRow>
          <TableCell>
            <IconButton onClick={this.toggleCollapse}>
              {this.state.expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell>
            {this.props.data.name}
          </TableCell>
          <TableCell>
            {this.props.data.members}
          </TableCell>
          <TableCell component="th" scope="row">
            <IconButton aria-haspopup="true" color="primary" disabled={this.props.readOnly} children={<EditIcon />} onClick={this.toggleRenameDialog} />
            <IconButton aria-haspopup="true" color="primary" disabled={this.props.readOnly} children={<DeleteIcon />} onClick={() => { this.props.onDelete(this.props.data); }} />
            <NsGroupDialog defaultName={this.props.data.name} open={this.state.renaming} blocked={this.state.isBusy} onClose={this.toggleRenameDialog} onInput={this.handleDialogInput} onSubmit={this.renameGroup} />
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
            <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>
              <Box margin={1}>
                <Typography variant="h6" gutterBottom component="div">
                  Nameservers of {this.props.data.name}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>Server</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Transfer Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    { this.state.members === null ? <></> : this.state.members.map( (member, index) => (
                      <NsGroupMemberRow
                        key={index}
                        members={this.state.members}
                        data={member}
                        readOnly={this.props.readOnly}
                        onRemove={this.removeMember}
                        onToggleHidden={this.toggleHiddenMember}
                        onSetPrimary={this.setPrimary}
                        onSetSource={this.setSource}
                      />
                    ) )}
                    { this.state.availableServers.length > 0 && (
                      <TableRow>
                        <TableCell colSpan="5">
                            <Button variant="contained" color="secondary" disabled={!Boolean(this.state.availableServers) || this.props.readOnly} startIcon={<AddCircle />} onClick={e => { this.setAddMenuAnchor(e.currentTarget); }}>Add Server</Button>
                            <Menu anchorEl={this.state.addMenuAnchor} open={Boolean(this.state.addMenuAnchor)} onClose={() => { this.setAddMenuAnchor(null); }}>
                              { this.state.availableServers.map( (server, index) => <MenuItem key={index} onClick={() => { this.addMember(server.ID); this.setAddMenuAnchor(null); }}>{server.name}</MenuItem> ) }
                            </Menu>
                        </TableCell>
                      </TableRow>
                    ) }
                  </TableBody>
                </Table>
                {this.state.members === null && ( <Box m={2}><LinearProgress /></Box> )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  }
}
