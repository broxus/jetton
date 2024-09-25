# jetton-contracts-2.0

## Build and test

```shell
npm install
npm run build
npm run test
```

Note: if you experience issues with running the test try to test using node.js 14

## Info

Current jetton contracts extend and modify some behavior of original contracts https://github.com/ton-blockchain/minter-contract.
But it is fully compatible with contracts that use ordinary jettons.

## Features

- <code>jetton-platform.fc</code> contract which allows the upgrade of wallet contracts
- on-chain jetton content encoding
- <code>on_accept_tokens_burn</code> callback for integration with other contracts
- <code>upgrade_wallet</code> and <code>upgrade_minter</code> opcodes for minter and wallet contracts upgrade
- additional admin opcodes in root <code>set_wallet_code</code> and <code>deploy_wallet</code>
- <code>provide_info</code> and <code>take_info</code> to get the minter's decimals, name, and symbol for another contract

## Features description

### jetton-platform.fc

The platform allows for upgradable and secure contracts without breaking compatibility between wallets of different versions.
Each contract in TVM receives a deterministic address from its code and init data: <code>address = hash(code + init_data)</code>.
To make upgradable jetton wallets we use jetton-platform.fc as code and address of its owner and minter as init data.
To check that the sender is a valid Jetton wallet we also use platform code with the owner's and minter's addresses to derive a valid address

```func
cell calculate_jetton_wallet_state_init(
    slice owner_address,
    slice jetton_master_address,
    cell jetton_platform_code
) inline {
    cell data = pack_jetton_wallet_data(
        0,
        owner_address,
        jetton_master_address,
        begin_cell().end_cell(),
        jetton_platform_code,
        0
    );

    return begin_cell()
        .store_uint(0, 2)
        .store_dict(jetton_platform_code) ;; code
        .store_dict(data) ;; init data
        .store_uint(0, 1)
        .end_cell();
}
```

To upgrade wallet from platform and perform <code>receive_tokens</code>:

```func
    ;; update contract's code for future txs
    set_code(wallet_code);

    ;; update contract's code for current receive_tokens() call. God bless us!!!
    set_c3(wallet_code.begin_parse().bless());

    ;; for newly deployed jetton wallet only receive_tokens() call is possible
    receive_tokens(
        ms,
        sender_address,
        my_balance,
        fwd_fee,
        msg_value
    );
```

### On-chain metadata

Jetton's metadata builds on-chain.

Note: replace Jetton's icon URL with yours

```func
slice image_slice = begin_cell()
    .store_slice("https://ton-tokens-api.bf.works/image/")
    .store_slice(my_workchain)
    .store_slice(":")
    .store_slice(my_hash)
    .store_slice(".svg")
    .end_cell()
    .begin_parse();

cell content_dict = new_dict();

content_dict~udict_set_ref(256, "image"H, pack_metadata_value(image_slice));
content_dict~udict_set_ref(256, "decimals"H, pack_metadata_value(decimals_slice));
content_dict~udict_set_ref(256, "name"H, pack_metadata_value(name.begin_parse()));
content_dict~udict_set_ref(256, "symbol"H, pack_metadata_value(symbol_slice));

cell onchain_content = begin_cell()
    .store_uint(0, 8)
    .store_dict(content_dict)
    .end_cell();
```

### op::on_accept_tokens_burn()

When the wallet's owner burns his jettons he will receive a notification callback from the minter.
It needs for integration with other contracts or protocols e.a.: DEXes, lendings, bridges, etc.

### op::upgrade_wallet() and op::upgrade_minter()

It's also possible to upgrade wallet and minter contracts anytime if you find vulnerabilities in contracts
or decided to extend their interface

### op::provide_info() and op::take_info()

These opcodes will provide you info about Jetton from the minter contract: decimals, name, symbol, etc.
It's useful if you need to identify your contracts by tokens' names or need to make price oracle,
curve-like DEX pools or some other useful stuff that needs Jetton's decimals, symbol, name, or your
custom metadata (chain ID and base token address for a bridge for example)

### Changed gas management in wallet's op::internal_transfer()

When the wallet receives a transfer it will try to keep its balance before the tx
or at least take some message's gas to pay for its storage.
Wallet's balance can be: [min_tons_for_storage, ∞)

```func
raw_reserve(max(ton_balance_before_msg, min_tons_for_storage), 2);
```

Also, you don't need to split your gas for <code>op::transfer_notification()</code> and <code>op::excesses()</code>.
In most cases, contracts want to send whole gas to notification or excesses callback.
Use a non-zero forward amount to send the whole gas to <code>op::transfer_notification()</code>.
Otherwise, the whole gas will be sent to <code>op::excesses()</code>

## Other minor features

- <code>op::drain()</code> in minter and wallet contracts to drain excesses from the contract's balance
- <code>jetton-wallet.fc#get_wallet_platform_data()</code> getter to receive platform code and current wallet's version
- <code>jetton-minter.fc#get_jetton_meta()</code> getter to receive raw metadata without dictionary
- <code>jetton-minter.fc#get_jetton_platform_data()</code> getter to receive platform code and current wallet's code version
