var lang = 'en_US';

var strings = {
    title: {
        en_US: "Summer html image map creator",
        pt_BR: "Summer: Criador de Image map Html"
    },
    drag_image: {
        en_US: "Drag an image",
        pt_BR: "Arraste e solte uma imagem"
    },
    or: {
        en_US: "or",
        pt_BR: "ou"
    },
    type_url: {
        en_US: "type a url",
        pt_BR: "digite uma url"
    },
    ok: {
        en_US: "OK",
        pt_BR: "OK"
    },
    main: {
        en_US: "Main",
        pt_BR: "Principal"
    },
    f5_description: {
        en_US: "reload the page and display the form for loading image again",
        pt_BR: "recarrega a pagina e exibe o formulário para carregar a imagem novamente"
    },
    s_description: {
        en_US: "save map params in localStorage",
        pt_BR: "salva os parâmetros do mapa no armazenamento local"
    },
    drawing_mode: {
        en_US: "Drawing mode (rectangle / circle / polygon)",
        pt_BR: "Modo de desenho (retângulo, círculo, polígono)"
    },
    dr_enter_description: {
        en_US: "stop polygon drawing (or click on first helper)",
        pt_BR: "interrompe o desenho do polígono (ou clique no primeiro ponto)"
    },
    dr_esc_description: {
        en_US: "cancel drawing of a new area",
        pt_BR: "cancela o desenho de uma nova área"
    },
    dr_shift_description: {
        en_US: "square drawing in case of a rectangle and right angle drawing in case of a polygon",
        pt_BR: "desenho quadrado no caso de um retângulo e ângulo perfeito em caso de um polígono"
    },
    editing_mode: {
        en_US: "Editing mode",
        pt_BR: "Modo de Edição"
    },
    ed_delete_description: {
        en_US: "remove a selected area",
        pt_BR: "remove uma área selecionada"
    },
    ed_esc_description: {
        en_US: "cancel editing of a selected area",
        pt_BR: "cancela a edição de uma área selecionada"
    },
    ed_shift_description: {
        en_US: "edit and save proportions for rectangle",
        pt_BR: "edita e salva as proporções para o retângulo"
    },
    ed_i_description: {
        en_US: "edit attributes of a selected area (or dblclick on an area)",
        pt_BR: "edita os atributos de uma área selecionada (ou clique 2x em uma área)"
    },
    ed_ctrl_c_description: {
        en_US: "a copy of the selected area",
        pt_BR: "uma cópia da área selecionada"
    },
    ed_up_description: {
        en_US: "move a selected area up",
        pt_BR: "move uma área selecionada para cima"
    },
    ed_down_description: {
        en_US: "move a selected area down",
        pt_BR: "move uma área selecionada para baixo"
    },
    ed_left_description: {
        en_US: "move a selected area to the left",
        pt_BR: "move uma área selecionada para a esquerda"
    },
    ed_right_description: {
        en_US: "move a selected area to the right",
        pt_BR: "move uma área selecionada para a direita"
    },
    mit_licence: {
        en_US: "MIT License",
        pt_BR: "Licença MIT"
    },
    save: {
        en_US: "save",
        pt_BR: "salvar"
    },
    load: {
        en_US: "load",
        pt_BR: "carregar"
    },
    from_html: {
        en_US: "from html",
        pt_BR: "do html"
    },
    rectangle: {
        en_US: "rectangle",
        pt_BR: "retângulo"
    },
    circle: {
        en_US: "circle",
        pt_BR: "círculo"
    },
    polygon: {
        en_US: "polygon",
        pt_BR: "polígono"
    },
    edit: {
        en_US: "edit",
        pt_BR: "editar"
    },
    to_html: {
        en_US: "to html",
        pt_BR: "para html"
    },
    preview: {
        en_US: "preview",
        pt_BR: "visualizar"
    },
    clear: {
        en_US: "clear",
        pt_BR: "limpar"
    },
    new_image: {
        en_US: "new image",
        pt_BR: "nova imagem"
    },
    attributes: {
        en_US: "Attributes",
        pt_BR: "Atributos"
    },
    href: {
        en_US: "href",
        pt_BR: "href"
    },
    alt: {
        en_US: "alt",
        pt_BR: "alt"
    },
    img_title: {
        en_US: "title",
        pt_BR: "título"
    },
    loading_areas: {
        en_US: "Loading Areas",
        pt_BR: "Carregando Áreas"
    },
    enter_html_code: {
        en_US: "Enter your html code:",
        pt_BR: "Preencha com seu código html"
    },
    loading: {
        en_US: "Loading",
        pt_BR: "Carregando"
    },
    objects: {
        en_US: "objects",
        pt_BR: "objeto(s)"
    },
    saved: {
        en_US: "Saved",
        pt_BR: "Salvo"
    }
}

function i18n(item) {
    if (typeof lang === 'undefined' || typeof strings[item][lang] === 'undefined') {
        lang = 'en_US';
    }
    document.write(strings[item][lang]);
}
