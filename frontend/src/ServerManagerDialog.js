import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import Button from '@material-ui/core/Button';

function FullTextField(props) {
  return <TextField fullWidth variant="outlined" margin="dense" {...props} />;
}

export default class ServerManagerDialog extends React.Component {

  static defaultProps = {
    open: false,
    new: false,
    toggleFunc: () => { console.error("no dialog toggle function defined."); },
    onSubmit: () => { console.error("no submit function defined."); },
    data: {
      dns_ip: "",
      dns_fqdn: "",
      name: "",
      managed: true,
      ssh_host: "",
      ssh_user: "",
      ssh_pass: "",
      config_path: "/etc/bind/managed",
    }
  };

  state = {
    isOpen: false,
    isBusy: false,
    isManaged: true,
  };

  constructor(props) {
    super(props);
    this.data = {...props.data};
    this.data.managed = Boolean(this.data.managed);
    this.state.isManaged = Boolean(props.data.managed);
  }

  handleInputChange = event => {
    let value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    this.data[event.target.name] = value;
    if( event.target.name === 'managed' ) this.setState({isManaged: value});
  }

  submitForm = () => {
    this.setState({isBusy: true});
    this.props.onSubmit(this.data).finally( () => { this.setState({isBusy: false}); });
  }

  pressKey = event => {
    if(event.key === 'Enter') this.submitForm();
  }

  render() {
    return (
      <Dialog open={this.props.open} onClose={this.props.toggleFunc} onKeyPress={this.pressKey}>
        <DialogTitle>{ this.props.new ? 'Add Server' : 'Edit Server' }</DialogTitle>
        <DialogContent>
          <FullTextField autoFocus required name="name" label="Server Name" helperText="Short server alias, for internal use only." defaultValue={this.data.name} onChange={this.handleInputChange} />
          <FullTextField required name="dns_ip" label="IP Address" defaultValue={this.data.dns_ip} onChange={this.handleInputChange} />
          <FullTextField required name="dns_fqdn" label="NS FQDN" helperText="Fully qualified domain name of the dns server. Will be used for NS records." defaultValue={this.data.dns_fqdn} onChange={this.handleInputChange} />
          <FormControlLabel control={<Switch checked={this.state.isManaged} name="managed" onChange={this.handleInputChange} color="primary" />} label="Managed Server" />
          { this.state.isManaged && <>
            <FullTextField name="ssh_host" label="SSH Host" defaultValue={this.data.ssh_host} onChange={this.handleInputChange} />
            <FullTextField name="ssh_user" label="SSH User" defaultValue={this.data.ssh_user} onChange={this.handleInputChange} />
            <FullTextField name="ssh_pass" label="SSH Password" type="password" helperText="Leave blank to use pubkey authentication only." defaultValue={this.data.ssh_pass} onChange={this.handleInputChange} />
            <FullTextField name="config_path" label="Configuration Path" helperText="Destination path for managed configuration. Must be writable for ssh user." defaultValue={this.data.config_path} onChange={this.handleInputChange} />
          </> }
        </DialogContent>
        <DialogActions>
          <Button disabled={this.state.isBusy} onClick={this.props.toggleFunc}>Cancel</Button>
          <Button disabled={this.state.isBusy} onClick={this.submitForm}>{ this.props.new ? 'Add Server' : 'Save Changes' }</Button>
        </DialogActions>
      </Dialog>
    );
  }
}
