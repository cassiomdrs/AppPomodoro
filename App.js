import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  StatusBar,
  ScrollView,
  Vibration,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

export default function App() {
  // Referência para controlar a rolagem da ScrollView
  const scrollViewRef = useRef(null);

  // 1. Estados de Configuração de Tempo (Horas e Minutos)
  const [focoHoras, setFocoHoras] = useState('0');
  const [focoMinutos, setFocoMinutos] = useState('25');
  const [descansoHoras, setDescansoHoras] = useState('0');
  const [descansoMinutos, setDescansoMinutos] = useState('5');

  // Estados dos Presets Dinâmicos (Salvos no AsyncStorage)
  const [presets, setPresets] = useState([
    { id: 1, label: 'Preset 1', fH: '0', fM: '25', dH: '0', dM: '5' },
    { id: 2, label: 'Preset 2', fH: '0', fM: '50', dH: '0', dM: '10' },
    { id: 3, label: 'Preset 3', fH: '1', fM: '0', dH: '0', dM: '15' },
  ]);

  // Estados do Cronômetro
  const [segundos, setSegundos] = useState(25 * 60);
  const [modo, setModo] = useState('FOCO'); // 'FOCO' ou 'DESCANSO'
  const [rodando, setRodando] = useState(false);
  const [sessaoIniciada, setSessaoIniciada] = useState(false);
  const [sessoesHoje, setSessoesHoje] = useState(0);

  // Estados de Anotações
  const [anotacao, setAnotacao] = useState('');
  const [anotacoesSalvas, setAnotacoesSalvas] = useState([]);
  const [mostrarLista, setMostrarLista] = useState(false);

  // 2. Carregar Anotações, Presets e Estatísticas do celular
  useEffect(() => {
    carregarDadosLocais();
  }, []);

  const carregarDadosLocais = async () => {
    try {
      const dadosAnotacoes = await AsyncStorage.getItem('@pomonai:anotacoes');
      if (dadosAnotacoes !== null) {
        setAnotacoesSalvas(JSON.parse(dadosAnotacoes));
      }

      const dadosPresets = await AsyncStorage.getItem('@pomonai:presets');
      if (dadosPresets !== null) {
        setPresets(JSON.parse(dadosPresets));
      }

      const hojeStr = new Date().toISOString().split('T')[0];
      const dadosSessoes = await AsyncStorage.getItem(`@pomonai:sessoes_${hojeStr}`);
      if (dadosSessoes !== null) {
        setSessoesHoje(parseInt(dadosSessoes) || 0);
      }
    } catch (e) {
      console.log('Erro ao carregar dados locais:', e);
    }
  };

  const salvarAnotacoesNoStorage = async (novaLista) => {
    try {
      await AsyncStorage.setItem('@pomonai:anotacoes', JSON.stringify(novaLista));
    } catch (e) {
      console.log('Erro ao salvar anotação:', e);
    }
  };

  const salvarPresetsNoStorage = async (novosPresets) => {
    try {
      await AsyncStorage.setItem('@pomonai:presets', JSON.stringify(novosPresets));
    } catch (e) {
      console.log('Erro ao salvar presets:', e);
    }
  };

  const incrementarSessaoHoje = async () => {
    const novaQtd = sessoesHoje + 1;
    setSessoesHoje(novaQtd);
    try {
      const hojeStr = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(`@pomonai:sessoes_${hojeStr}`, String(novaQtd));
    } catch (e) {
      console.log('Erro ao salvar contador de sessões:', e);
    }
  };

  // 3. Alarme Tátil (Vibração)
  function tocarAlarme() {
    Vibration.vibrate([0, 500, 200, 500, 200, 1000]);
  }

  // 4. Converter entradas de Horas/Minutos para Segundos Totais
  const calcularSegundosTotais = (hStr, mStr) => {
    const h = parseInt(hStr) || 0;
    const m = parseInt(mStr) || 0;
    return (h * 3600) + (m * 60);
  };

  // 5. Lógica do Cronômetro
  useEffect(() => {
    let intervalo = null;

    if (rodando && segundos > 0) {
      intervalo = setInterval(() => {
        setSegundos((seg) => seg - 1);
      }, 1000);
    } else if (segundos === 0 && rodando) {
      setRodando(false);
      setSessaoIniciada(false);
      tocarAlarme();

      if (modo === 'FOCO') {
        incrementarSessaoHoje();
        setModo('DESCANSO');
        setSegundos(calcularSegundosTotais(descansoHoras, descansoMinutos));
      } else {
        setModo('FOCO');
        setSegundos(calcularSegundosTotais(focoHoras, focoMinutos));
      }

      clearInterval(intervalo);
    }

    return () => clearInterval(intervalo);
  }, [rodando, segundos, modo, focoHoras, focoMinutos, descansoHoras, descansoMinutos]);

  // Formatação do Tempo para HH:MM:SS ou MM:SS
  const formatarTempo = (totalSegundos) => {
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;

    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');

    if (h > 0) {
      const hStr = String(h).padStart(2, '0');
      return `${hStr}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  // Formatação dos Textos nos Botões de Preset
  const formatarTextoPreset = (fH, fM, dH, dM) => {
    const focoText = parseInt(fH) > 0 ? `${fH}h ${fM}m` : `${fM}m`;
    const descansoText = parseInt(dH) > 0 ? `${dH}h ${dM}m` : `${dM}m`;
    return `${focoText} / ${descansoText}`;
  };

  // Ação ao clicar no Preset
  const gerenciarCliquePreset = (presetItem) => {
    if (sessaoIniciada) return;

    const mesmoTempo = 
      (parseInt(focoHoras) || 0) === (parseInt(presetItem.fH) || 0) &&
      (parseInt(focoMinutos) || 0) === (parseInt(presetItem.fM) || 0) &&
      (parseInt(descansoHoras) || 0) === (parseInt(presetItem.dH) || 0) &&
      (parseInt(descansoMinutos) || 0) === (parseInt(presetItem.dM) || 0);

    if (mesmoTempo) {
      aplicarPreset(presetItem.fH, presetItem.fM, presetItem.dH, presetItem.dM);
    } else {
      Alert.alert(
        "Opções de Preset",
        `Você deseja aplicar o tempo deste preset ou salvar a sua nova configuração digitada nele?`,
        [
          { 
            text: "Aplicar Preset", 
            onPress: () => aplicarPreset(presetItem.fH, presetItem.fM, presetItem.dH, presetItem.dM) 
          },
          { 
            text: "Salvar neste Preset", 
            onPress: () => salvarNovoPreset(presetItem.id) 
          },
          { text: "Cancelar", style: "cancel" }
        ]
      );
    }
  };

  const aplicarPreset = (fH, fM, dH, dM) => {
    setFocoHoras(String(fH));
    setFocoMinutos(String(fM));
    setDescansoHoras(String(dH));
    setDescansoMinutos(String(dM));
    setModo('FOCO');
    setSegundos(calcularSegundosTotais(fH, fM));
  };

  const salvarNovoPreset = (presetId) => {
    const fH = focoHoras || '0';
    const fM = focoMinutos || '0';
    const dH = descansoHoras || '0';
    const dM = descansoMinutos || '0';

    const novosPresets = presets.map((p) => {
      if (p.id === presetId) {
        return { ...p, fH, fM, dH, dM };
      }
      return p;
    });

    setPresets(novosPresets);
    salvarPresetsNoStorage(novosPresets);
    aplicarPreset(fH, fM, dH, dM);
    Alert.alert("Sucesso!", "Novo tempo gravado neste preset.");
  };

  // Controle de Pausa e Interrupção Segura
  const alternarPausa = () => {
    if (!sessaoIniciada) {
      setSessaoIniciada(true);
    }
    setRodando(!rodando);
  };

  const solicitarInterrupcao = () => {
    if (!sessaoIniciada && !rodando) {
      resetarCronometro();
      return;
    }
    Alert.alert(
      "Interromper Sessão",
      "Tem certeza de que deseja interromper a sessão atual?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Interromper", style: "destructive", onPress: resetarCronometro }
      ]
    );
  };

  const resetarCronometro = () => {
    setRodando(false);
    setSessaoIniciada(false);
    setModo('FOCO');
    setSegundos(calcularSegundosTotais(focoHoras, focoMinutos));
  };

  // Gerenciamento de Anotações com ROLAGEM AUTOMÁTICA
  const focarCampoAnotacoes = () => {
    // Aguarda a animação do teclado subir e rola a tela para focar no campo
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 200);
  };

  const adicionarAnotacao = () => {
    if (anotacao.trim() !== '') {
      const novaLista = [...anotacoesSalvas, anotacao];
      setAnotacoesSalvas(novaLista);
      salvarAnotacoesNoStorage(novaLista);
      setAnotacao('');
      Keyboard.dismiss();
    }
  };

  const solicitarRemocaoAnotacao = (index) => {
    Alert.alert(
      "Excluir Anotação",
      "Deseja realmente excluir esta anotação?",
      [
        { text: "Não", style: "cancel" },
        { 
          text: "Sim", 
          style: "destructive", 
          onPress: () => removerAnotacao(index) 
        }
      ]
    );
  };

  const removerAnotacao = (index) => {
    const novaLista = anotacoesSalvas.filter((_, i) => i !== index);
    setAnotacoesSalvas(novaLista);
    salvarAnotacoesNoStorage(novaLista);
  };

  const copiarAnotacoes = async () => {
    if (anotacoesSalvas.length === 0) return;
    const textoCompleto = anotacoesSalvas.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
    await Clipboard.setStringAsync(textoCompleto);
    Alert.alert("Copiado!", "Todas as suas anotações foram copiadas para a área de transferência.");
  };

  const obterRotuloBotaoAcao = () => {
    if (rodando) {
      return "⏸️ Pausar";
    }
    if (sessaoIniciada) {
      return "▶️ Continuar";
    }
    return "▶️ Iniciar";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1c1d22" />
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Cabeçalho Limpo */}
          <View style={styles.headerClean}>
            <Text style={styles.headerTitle}>Pomonai by Cássio</Text>
            <Text style={styles.sessionCounterBadge}>🎯 Sessões Hoje: {sessoesHoje}</Text>
          </View>

          {/* Configurações de Tempo */}
          {!sessaoIniciada && (
            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Ajustar Tempo da Sessão</Text>
              
              {/* Campo FOCO */}
              <View style={styles.timeSettingRow}>
                <Text style={styles.settingLabel}>FOCO:</Text>
                <View style={styles.inputsPair}>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    maxLength={2}
                    value={focoHoras}
                    onFocus={() => setFocoHoras('')}
                    onBlur={() => { if (focoHoras === '') setFocoHoras('0'); }}
                    onChangeText={(val) => {
                      setFocoHoras(val);
                      if (modo === 'FOCO') setSegundos(calcularSegundosTotais(val, focoMinutos));
                    }}
                  />
                  <Text style={styles.unitText}>h</Text>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    maxLength={2}
                    value={focoMinutos}
                    onFocus={() => setFocoMinutos('')}
                    onBlur={() => { if (focoMinutos === '') setFocoMinutos('0'); }}
                    onChangeText={(val) => {
                      setFocoMinutos(val);
                      if (modo === 'FOCO') setSegundos(calcularSegundosTotais(focoHoras, val));
                    }}
                  />
                  <Text style={styles.unitText}>min</Text>
                </View>
              </View>

              {/* Campo DESCANSO */}
              <View style={styles.timeSettingRow}>
                <Text style={styles.settingLabel}>DESCANSO:</Text>
                <View style={styles.inputsPair}>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    maxLength={2}
                    value={descansoHoras}
                    onFocus={() => setDescansoHoras('')}
                    onBlur={() => { if (descansoHoras === '') setDescansoHoras('0'); }}
                    onChangeText={(val) => setDescansoHoras(val)}
                  />
                  <Text style={styles.unitText}>h</Text>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    maxLength={2}
                    value={descansoMinutos}
                    onFocus={() => setDescansoMinutos('')}
                    onBlur={() => { if (descansoMinutos === '') setDescansoMinutos('0'); }}
                    onChangeText={(val) => setDescansoMinutos(val)}
                  />
                  <Text style={styles.unitText}>min</Text>
                </View>
              </View>

              {/* Presets Rápidos e Personalizáveis */}
              <View style={styles.presetsRow}>
                {presets.map((preset) => (
                  <TouchableOpacity 
                    key={preset.id}
                    style={styles.presetButton} 
                    onPress={() => gerenciarCliquePreset(preset)}
                  >
                    <Text style={styles.presetText}>
                      {formatarTextoPreset(preset.fH, preset.fM, preset.dH, preset.dM)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Relógio Pomodoro */}
          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{formatarTempo(segundos)}</Text>
              <Text style={styles.timerSubtext}>{modo}</Text>
              <TouchableOpacity onPress={solicitarInterrupcao}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Botões de Controle de Sessão */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.buttonSecondary} onPress={alternarPausa}>
              <Text style={styles.buttonSecondaryText}>
                {obterRotuloBotaoAcao()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonSecondary} onPress={solicitarInterrupcao}>
              <Text style={styles.buttonSecondaryText}>
                ⏹️ Interromper
              </Text>
            </TouchableOpacity>
          </View>

          {/* Módulo de Anotações (com ajuste automático de tela) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Anotações Rápidas</Text>
            
            <View style={styles.inputBoxContainer}>
              <TextInput
                style={styles.input}
                placeholder="Digite sua anotação ou dúvida do momento..."
                placeholderTextColor="#888"
                value={anotacao}
                onChangeText={setAnotacao}
                onFocus={focarCampoAnotacoes}
                multiline
              />
            </View>

            <TouchableOpacity style={styles.buttonPrimary} onPress={adicionarAnotacao}>
              <Text style={styles.buttonPrimaryText}>📄 Salvar Anotação</Text>
            </TouchableOpacity>
          </View>

          {/* Rodapé: Contador de Anotações */}
          <View style={styles.footerCard}>
            <Text style={styles.footerText}>
              Anotações: <Text style={styles.footerBold}>{anotacoesSalvas.length}</Text>
            </Text>
            <TouchableOpacity onPress={() => {
              setMostrarLista(!mostrarLista);
              if (!mostrarLista) focarCampoAnotacoes();
            }}>
              <Text style={styles.footerLink}>
                {mostrarLista ? 'Ocultar Anotações' : 'Ver Minhas Anotações'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Listagem de Anotações Salvas */}
          {mostrarLista && (
            <View style={styles.listaContainer}>
              {anotacoesSalvas.length > 0 && (
                <TouchableOpacity style={styles.copyButton} onPress={copiarAnotacoes}>
                  <Text style={styles.copyButtonText}>📋 Copiar Todas as Anotações</Text>
                </TouchableOpacity>
              )}

              {anotacoesSalvas.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma anotação salva até o momento.</Text>
              ) : (
                anotacoesSalvas.map((item, index) => (
                  <View key={index} style={styles.itemAnotacao}>
                    <Text style={styles.itemTexto}>{index + 1}. {item}</Text>
                    <TouchableOpacity onPress={() => solicitarRemocaoAnotacao(index)}>
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 🎨 Estilos Profissionais em Tema Escuro
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1d22',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  headerClean: {
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sessionCounterBadge: {
    color: '#ff5e36',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  configCard: {
    backgroundColor: '#2b2c34',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  configTitle: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  timeSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  inputsPair: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: '#222329',
    color: '#ff5e36',
    fontWeight: 'bold',
    fontSize: 15,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#444550',
    minWidth: 40,
    textAlign: 'center',
  },
  unitText: {
    color: '#888888',
    fontSize: 12,
    marginHorizontal: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  presetButton: {
    flex: 0.31,
    backgroundColor: '#3a3b45',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  presetText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  timerCircle: {
    width: 175,
    height: 175,
    borderRadius: 87.5,
    borderWidth: 6,
    borderColor: '#ff5e36',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#26272d',
  },
  timerText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  timerSubtext: {
    color: '#a0a0a0',
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 2,
  },
  closeIcon: {
    color: '#888',
    fontSize: 14,
    marginTop: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  buttonSecondary: {
    flex: 0.48,
    borderColor: '#444550',
    borderWidth: 1.5,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#2b2c34',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputBoxContainer: {
    borderWidth: 1,
    borderColor: '#ff5e36',
    borderRadius: 12,
    padding: 12,
    minHeight: 70,
    backgroundColor: '#222329',
    marginBottom: 12,
  },
  input: {
    color: '#ffffff',
    fontSize: 14,
  },
  buttonPrimary: {
    backgroundColor: '#ff5e36',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  footerCard: {
    backgroundColor: '#2b2c34',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  footerBold: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  footerLink: {
    color: '#ff5e36',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  listaContainer: {
    marginTop: 10,
    backgroundColor: '#2b2c34',
    borderRadius: 12,
    padding: 12,
  },
  copyButton: {
    backgroundColor: '#3a3b45',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 6,
  },
  itemAnotacao: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3b45',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTexto: {
    color: '#ffffff',
    fontSize: 14,
    flex: 0.9,
  },
  deleteIcon: {
    fontSize: 16,
    padding: 4,
  },
});