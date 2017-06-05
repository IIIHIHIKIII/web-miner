function $$(selector) {
    return document.querySelector(selector);
}

class WalletUI {
    constructor($) {
        this.$ = $;

        this._pendingTx = null;

        this._accountInput = $$('#wallet-account-input');
        this._accountInput.onchange = () => this._validateAddress();

        this._amountInput = $$('#wallet-amount-input');
        this._amountInput.onchange = () => this._validateAmount();

        this._sendTxBtn = $$('.wallet-submit-button');
        this._sendTxBtn.onclick = () => this._sendTx();

        const accountAddr = $$('#wallet-account p');
        accountAddr.innerText = $.wallet.address.toHex();

        $.accounts.getBalance($.wallet.address).then(balance => this._onBalanceChanged(balance));
        $.accounts.on($.wallet.address, balance => this._onBalanceChanged(balance));

        $.mempool.on('transaction-added', () => this._onTxReceived(tx));
        $.mempool.on('transactions-ready', () => this._onTxsProcessed());
    }

    show() {
        $$('body')[0].className = 'has-overlay';
    }

    hide() {
        $$('body')[0].className = '';
    }

    _isAccountAddressValid() {
        return /[0-9a-f]{40}/i.test(this._accountInput.firstChild.value);
    }

    _validateAddress() {
        this._accountInput.className = this._isAccountAddressValid() ? '' : 'invalid';
        this._checkEnableSendTxBtn();
    }

    _isAmountValid() {
        const amount = parseFloat(this._amountInput.firstChild.value);
        const satoshis = Nimiq.Policy.coinsToSatoshis(amount);
        return satoshis > 0 && satoshis <= this._balance.value;
    }

    _validateAmount() {
        this._amountInput.className = this._isAmountValid() ? '' : 'invalid';
        this._checkEnableSendTxBtn();
    }

    _checkEnableSendTxBtn() {
        this._sendTxBtn.disabled = !this._isAccountAddressValid() || !this._isAmountValid();
    }

    _onBalanceChanged(balance) {
        this._balance = balance;
        $$('#wallet-balance').innerText = Nimiq.Policy.satoshisToCoins(balance.value).toFixed(2);
    }

    _onTxReceived(tx) {
        if (!this.$.wallet.address.equals(tx.recipientAddr)) return;

        // TODO Show incoming message.
    }

    _onTxsProcessed() {
        if (this._pendingTx) {
            this._pendingTx.hash().then(hash => {
                if (!this.$.mempool.getTransaction(hash)) {
                    this._transactionConfirmed();
                }
            });
        }
    }

    _sendTx() {
        if (!this._isAccountAddressValid() || !this._isAmountValid()) return;

        const recipient = this._accountInput.firstChild.value;
        const address = Nimiq.Address.fromHex(recipient);

        const amount = parseFloat(this._amountInput.firstChild.value);
        const satoshis = Nimiq.Policy.coinsToSatoshis(amount);

        this.$.wallet.createTransaction(address, satoshis, 0, this._balance.nonce)
            .then(tx => {
                this.$.mempool.pushTransaction(tx).then(result => {
                    if (!result) {
                        alert('Transaction failed! Please try again.');
                    } else {
                        this._transactionPending(tx);
                    }
                });
            });
    }

    _transactionPending(tx) {
        this._accountInput.firstChild.value = '';
        this._amountInput.firstChild.value = '';
        this._accountInput.firstChild.disabled = true;
        this._amountInput.firstChild.disabled = true;

        $$('#wallet').className = 'transaction-pending';
        this._pendingTx = tx;
    }

    _transactionConfirmed() {
        this._accountInput.firstChild.disabled = false;
        this._amountInput.firstChild.disabled = false;

        $$('#wallet').className = '';
        this._pendingTx = null;
    }
}
