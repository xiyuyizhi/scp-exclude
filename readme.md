## scp-exclude

extension the linux command scp,with the capacity of exclude some directory or file when use scp

### installation

prerequisites: Node.js(>=8)

```
npm install scp-exclude -g
```

### Usage

the use is similar with scp command directly,except for the following differences

- you need list files before other options,you can learn scp usage with `man scp`

```
scp-exclude user@host1:file1  user@host2:file2   [-12346BCpqrv] [-c cipher] [-F ssh_config] [-i identity_file] [-l limit] [-o ssh_option] [-P port] [-S program] [-I regexp](add)

Example:
scp-exclude  localfile root@host:remotePath -2 -P 8899
```

- you can ignore some file or directory by specified -I or --ignore

```
Example:
scp-exclude  localDir  root@host:remotePath  -I  node_modules,.vscode  -1  -P 8899
//the will ignore  node_modules and .vscode  dir below  localDir
```

- when you specified a empty directory or a directory contains empty subDir ,it will ignore the empty dir

### License

[MIT](https://opensource.org/licenses/MIT)
