# BrowserID Primary IdP  Protocol

## 1. Overview

The BrowserID protocol is designed to allow identity providers to
directly vouch for their users ownership of email addresses that they
issue.  The means by which they do this is by implementing the BrowserID
Primary IdP Protocol.  Concretely, this involves the publication
resources which advertise support, perform headless certificate
provisioning, and expose a web based user interface to allow for
authentication to their service from within a window rendered by
BrowserID.

Finally, the protocol is designed to be compatible with both an HTML
implementation of BrowserID, or a native browser implementation.

## 2. Requirements

A BrowserID primary identity authority must implement the following:

  1. **A declaration of support**: An IdP must explicitly declare, in
     the form of a document hosted on their domain, that they support
     BrowserID.  This contents of this document may include paths
     supporting resources, as well as a public key which allows other
     sites to verify assertions generated using certificates that the
     primary has issued.
  2. **Authentication page**: A user must be able to interact with
     their IdP at the time that they are logging into a website to prove
     their identity to the IdP and establish a session.
  3. **Provisioning page**: A webpage must be provided which is
     capable of provisioning a user that is authenticated to the IdP with
     a certificate.

The remainder of this document discusses these requirements.

## 3. Declaration of Support

In order to make it possible for the browser to determine if there is
primary support available for a given domain, there must be a well
knonw location where an expression of support is published.  [RFC
5785][] proposes a convention for well-known resources, such as that
required by BrowserID, which is a `.well-known` directory under
document root.  Applying this convention, primaries must serve a JSON
document under `.well-known/browserid`.

  [RFC 5785]: http://tools.ietf.org/html/rfc5785

This document should:

  1. be served from `/.well-known/browserid`
  2. be served with a `Content-Type` of `application/json`
  3. be provided over SSL.
  4. have cache headers inline with the desires of the primary

The top level keys present have the following contents and meaning:

  * **public-key** is a public key that can be used to
    verify that certificates issued from the primary are authentic.
  * **authentication** is a path that serves web content that can be
    rendered by UI rendered by the browser to allow the user to
    authenticate to the IdP.
  * **provisioning** is a path to content that is capable of
    attaining a certificate given an established session with the
    IdP.

### 3.1. Example

    {
        "public-key": { <public key as json object> },
        "authentication": "/browserid/auth",
        "provisioning": "/browserid/provision"
    }

### 3.2. Delegation of Authority

In the event that a domain wishes to have primary support for email
addresses underneath it, but wishes for that support to be implemented
by a domain other than its own, it may explicity delegate
authentication and provisioning to another host.  Delegation occurs
when a `authority` property is present in the declaration of support
which contains a domain name (in which case, all other properties
present are ignored).

An example declaration of supporty which delegates is thus:

    {
        "authority": "otherhost.tld"
    }

In attempting to determine whether primary BrowserID support exists
for an email address `lloyd@mozilla.com`, a browser will first pull
`https://somehost.tld/.well-known/browserid`, upon discovery of delegated
authority, the browser would next check
`https://otherhost.tld/.well-known/browserid`.

Normal caching rules apply, and as with HTTP, clients should detect
infinite redirection loops and may limit redirection to a reasonable
maximum, like 5.

### 3.3. Duration of Validity

A declaration of support can contain public keys, which may change.  At
the same time, anyone who verifies assertions must fetch these resources
in order to authenticate users.  Validity duration is expressed using
standard HTTP caching headers, and primaries should allow this resource to
be cached at least six hours, with appropriate deployment strategies to
gracefully introduce changes.  A reasonable cache header on a declaration
of support might be:

    Cache-Control: public, max-age=21600

### 3.4 Open Issues

#### 3.4.1 Key Decommissioning

In this specification, there's no way for a primary to publish more that
one public key, which would be required to enable transitioning from
one root keypair to another.  It's suggested we consider allowing the
`public-key` property of the declaration of support to have an array of
keys as a value, and update the verification algorithm and formats to
support simple but efficient determination of which public key to use
in the event there are multiple.

## 4. Provisioning Content

Provisioning content are web resources served by the IdP that can
interact with the primary provider and the BrowserID JavaScript API to
check if the user is authenticated, generated a keypair, sign the public
key to create a certificate, and return that certificate to BrowserID
via the JavaScript API.

Provisioning content is a web resource that is designed to run in a
headless javascript environment (the DOM of the content is not displayed,
and it MAY be run in a sandbox allocated by the browser without access
to `window.*` properties available to normal web content).

### 4.1. Example

    // get parameters of provisioning
    navigator.id.beginProvisioning(function(email, cert_duration) {

        // ... check if the current user is authenticated as 'email' ...
        if (notAuthenticated()) {
            navigator.id.raiseProvisioningFailure("user isn't authenticated");
        }

        // request a keypair be generated by browserid and get the public key
        navigator.id.genKeyPair(function(pubkey) {

            // ... interact with the server to sign the public key and get
            // a certificate ...
            var cert = someServerInteraction();

            // pass the certificate back to BrowserID and complete the
            // provisioining process
            navigator.id.registerCertificate(cert);
        });
    });

### 4.2 JavaScript Shim

To support browsers without native BrowserID support, the provisioning
content should include the a javascript shim, hosted at:

    https://browserid.org/provisioning_api..js

### 4.3. BrowserID API

    // A function invoked to fetch provisioning parameters, such as
    // email and desired certificate duration.
    navigator.id.beginProvisioning(function(email, cert_duration_s) { });

    // cause the browser to generate a key-pair, cache the private key
    // and return the public key for signing.
    navigator.id.genKeyPair(function(pubkey) { });

    // upon successful certificate signing, register the certificate
    // with the browser.
    navigator.id.registerCertificate(certificate);

    // in the event of a failure, the provisioning code should
    // invoke this function to terminate the provisioning process,
    // providing a developer readable string
    navigator.id.raiseProvisioningFailure(string);

### 4.4. Certificate Duration

The primary should consider the certificate duration provided by BrowserID
to be an upper bound on duration.  Under scenarios where the user is on a
shared device that is not their own, certificate duration will be shorter.
Further, depending on the capabilities of the device, the public key generated
maybe be weaker.

Given that these factors that are not known to the provisioning page weigh into
certificate duration, the primary should defer to this value, and BrowserID may
delete before their expiration if it exceeds the maximum.

### 4.5. Considerations

#### 4.5.1 Authentication and Third Party Cookies

When native browser support is not available, provisioning content will be run
in an iframe.  Certain browser configurations may surpress cookies when content
is run in such an environment.  Primary providers that want to improve their
browser support should consider alternate authentication mechansims to support
browsers with this featuere.

#### 4.5.2 Error Handling

When a fatal error that will prevent provisioning from completing successfully
is detected, the provisioning content should invoke
`navigator.id.raiseProvisioningFailure()`.  This ends the provisioning attempt
and indicates that the evaluation contenxt in which the provisioning code is
running can be immediately torn down.

The primary may provide a developer readable error string that may be
outputted on a browser-specific error console to facilitate debugging.

#### 4.5.3 Non-Responsiveness

A BrowserID implementation should detect when the provisioning content
has become non-responsive.  Provisioning code, in turn, should follow
the following guidelines to facilitate this detection and prevent
false positives:

  * Upon content load invoke `navigator.id.beginProvisioning()`
    promptly to indicate successful load and initiation
  * Only after it has been verified that the user is authenticated as
    the target email should `.genKeyPair()` be invoked.

## 5. Authentication Page

The authentication page is displayed from within the BrowserID dialog
after silent provisioning fails, and is intended to allow the user to
provide authentication credentials to the primary as part of
authenticating to a website.

The authentication page should be designed to work well on mobile
devices and desktops.  For the latter, the IdP may assume a resolution
of 700 pixels by 375 pixels.

Subsequent to this interaction, the BrowserID dialog will re-attempt the
provisioning process, and the results of that will indicate whether the
user has successfully authenticated with the primary.

### 5.1 Example

### 5.2 JavaScript Shim

To support browsers without native BrowserID support, the
authentication page should include the a javascript shim, hosted at:

    https://browserid.org/authentication_api.js

### 5.3 BrowserID API

    // Access the email that the user has specified they would like
    // to use to sign in.
    navigator.id.beginAuthentication(function(email) { });

    // Indicate that the authentication process has completed
    // successfully
    navigator.id.completeAuthentication();

    // Indicate that the authentication process has failed, optionally
    // providing a developer readable reason.
    navigator.id.raiseAuthenticationFailure(string reason);

## 6. Cryptographic Details

### 6.1 Public Key Format

XXX: write me or point to another document

### 6.2 Certificate Format

XXX: write me or point to another document

### 6.3 Signing procedure

XXX: write me or point to another document