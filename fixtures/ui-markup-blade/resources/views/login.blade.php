<main class="login-page">
  <div class="login-card">
    <h1>{{ $title }}</h1>
    @if($showHint)
      <p class="hint">Enter credentials</p>
    @endif
    @if($showUpgradeModal)
      <div class="modal-panel">
        <p>Upgrade plan</p>
      </div>
    @endif
    <ul>
      @foreach($items as $item)
        <li>{{ $item['label'] }}</li>
      @endforeach
    </ul>
    @yield('footer')
    <button type="button" x-show="showToast" wire:click="submit">Sign in</button>
  </div>
</main>
