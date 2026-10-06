# SPDX-License-Identifier: Apache-2.0
# Windows PowerShell 5.1, local NTFS only. Never change an existing file's ACL.
param([string]$Operation,[string]$Path,[int]$MaxBytes=2097152)
$ErrorActionPreference='Stop'
$stream=$null
try {
  [Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
  [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
  if($PSVersionTable.PSEdition -ne 'Desktop' -or $MaxBytes -lt 1 -or $MaxBytes -gt 2097152){throw 'invalid'}
  $full=[IO.Path]::GetFullPath($Path)
  if($full -notmatch '^[A-Za-z]:\\' -or $full.Substring(2).Contains(':')){throw 'invalid'}
  $root=[IO.Path]::GetPathRoot($full)
  if([IO.DriveInfo]::new($root).DriveFormat -ne 'NTFS'){throw 'invalid'}
  $walk=$full
  while($walk){
    if([IO.File]::Exists($walk) -or [IO.Directory]::Exists($walk)){
      if(([IO.File]::GetAttributes($walk) -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'invalid'}
    }
    $walk=[IO.Path]::GetDirectoryName($walk)
  }
  $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
  $rights=[Security.AccessControl.FileSystemRights]::FullControl
  function Check-Private([IO.FileStream]$Handle){
    $acl=$Handle.GetAccessControl()
    if(-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value){throw 'invalid'}
    $rules=$acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])
    if($rules.Count -ne 1){throw 'invalid'}
    $r=$rules[0]
    if($r.IsInherited -or $r.IdentityReference.Value -ne $sid.Value -or $r.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or $r.FileSystemRights -ne $rights){throw 'invalid'}
  }
  if($Operation -eq 'create'){
    $text=[Console]::In.ReadToEnd()
    $bytes=[Text.Encoding]::UTF8.GetBytes($text)
    if($bytes.Length -gt $MaxBytes){throw 'invalid'}
    $security=[Security.AccessControl.FileSecurity]::new()
    $security.SetOwner($sid)
    $security.SetAccessRuleProtection($true,$false)
    $security.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,$rights,[Security.AccessControl.AccessControlType]::Allow))
    # ACL supplied at CreateNew BEFORE sensitive bytes; no inherited-access window.
    $stream=[IO.FileStream]::new($full,[IO.FileMode]::CreateNew,$rights,[IO.FileShare]::None,4096,[IO.FileOptions]::None,$security)
    Check-Private $stream
    $stream.Write($bytes,0,$bytes.Length)
    $stream.Flush($true)
    Check-Private $stream
  } elseif($Operation -eq 'read' -or $Operation -eq 'check'){
    $stream=[IO.FileStream]::new($full,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
    Check-Private $stream
    if($stream.Length -gt $MaxBytes){throw 'invalid'}
    if($Operation -eq 'read'){
      $bytes=[byte[]]::new([int]$stream.Length)
      $offset=0
      while($offset -lt $bytes.Length){$n=$stream.Read($bytes,$offset,$bytes.Length-$offset);if($n -le 0){throw 'invalid'};$offset+=$n}
      [Console]::Write([Text.UTF8Encoding]::new($false,$true).GetString($bytes))
    }
  } else {throw 'invalid'}
} catch {
  [Console]::Error.WriteLine('PRIVATE_FILE_INVALID')
  exit 1
} finally {if($null -ne $stream){$stream.Dispose()}}
